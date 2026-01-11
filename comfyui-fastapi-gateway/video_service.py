"""
Video Generation Service using BytePlus Seedance API
Provides text-to-video and image-to-video generation capabilities.
"""

import os
import io
import base64
import datetime
import uuid
import pathlib
import time
import requests
import asyncio
from dotenv import load_dotenv
from fastapi import HTTPException

# Load environment variables
load_dotenv()

ARK_API_KEY = os.getenv("ARK_API_KEY")
SEEDANCE_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
SEEDANCE_MODEL = "seedance-1-5-pro-251215"


def save_video_to_disk(video_data: bytes, model_name: str = "seedance") -> str:
    """
    Saves video bytes to output_api/{date}/video/{model}_{time}_{uid}.mp4
    Returns: Absolute path of saved file
    """
    try:
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        output_dir = pathlib.Path("output_api") / today / "video"
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%H-%M-%S")
        short_id = str(uuid.uuid4())[:8]
        clean_model = model_name.replace(":", "").replace("/", "-").split("-")[0]
        filename = f"{clean_model}_{timestamp}_{short_id}.mp4"
        filepath = output_dir / filename

        with open(filepath, "wb") as f:
            f.write(video_data)

        print(f"DEBUG: Saved video to: {filepath.absolute()}")
        return str(filepath.absolute())
    except Exception as e:
        print(f"ERROR: Failed to save video: {e}")
        import traceback
        traceback.print_exc()
        return None


def _prepare_image_for_api(image_input: str) -> str:
    """
    Prepare image for Seedance API.
    - Downloads localhost/local URLs and converts to base64 (API can't access local servers)
    - Public URLs are returned as-is
    - Base64 data is formatted as data URL
    """
    print(f"DEBUG: _prepare_image_for_api input: {image_input[:100]}...")
    
    if image_input.startswith("http"):
        # Check if it's a localhost/local URL - download and convert to base64
        if "localhost" in image_input or "127.0.0.1" in image_input or "192.168." in image_input:
            print(f"DEBUG: Local URL detected, downloading and converting to base64...")
            try:
                response = requests.get(image_input, timeout=10)
                response.raise_for_status()
                image_bytes = response.content
                
                # Detect image type from content
                content_type = response.headers.get('content-type', 'image/png')
                if 'jpeg' in content_type or 'jpg' in content_type:
                    mime_type = 'image/jpeg'
                elif 'png' in content_type:
                    mime_type = 'image/png'
                elif 'webp' in content_type:
                    mime_type = 'image/webp'
                else:
                    mime_type = 'image/png'  # fallback
                
                b64_data = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:{mime_type};base64,{b64_data}"
                print(f"DEBUG: Converted local URL to base64 data URL ({len(b64_data)} chars)")
                return data_url
            except Exception as e:
                print(f"ERROR: Failed to download local image: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to download image from {image_input}: {e}")
        else:
            # Public URL - return as-is
            print(f"DEBUG: Public URL, using as-is")
            return image_input
    else:
        # Base64 data
        if not image_input.startswith("data:"):
            result = f"data:image/png;base64,{image_input}"
            print(f"DEBUG: Added data URL prefix to base64")
            return result
        print(f"DEBUG: Already a data URL")
        return image_input


async def generate_video_seedance(
    prompt: str,
    model_name: str = None,
    first_frame_image: str = None,
    last_frame_image: str = None,
    resolution: str = "720p",
    ratio: str = None,
    duration: int = 5,
    seed: int = -1,
    camera_fixed: bool = False,
    watermark: bool = False,
    generate_audio: bool = False
) -> dict:
    """
    Generate video using Seedance API.
    
    Parameters:
        prompt: Text description (can include --duration, --rs, --rt, etc.)
        model_name: Model ID (default: seedance-1-5-pro-251215)
        first_frame_image: Optional base64/URL for first frame (I2V)
        last_frame_image: Optional base64/URL for last frame
        resolution: 480p, 720p, 1080p (720p default)
        ratio: 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive
        duration: 4-12 seconds, or -1 for auto (default: 5)
        seed: -1 for random, or specific value
        camera_fixed: Lock camera movement (T2V only, not for I2V)
        watermark: Add watermark to output
        generate_audio: Generate audio for the video
    
    Returns:
        dict with 'video_url', 'video_base64', 'duration', 'saved_path', etc.
    """
    actual_model = model_name or SEEDANCE_MODEL
    
    print(f"DEBUG: generate_video_seedance called")
    print(f"DEBUG: Model: {actual_model}")
    print(f"DEBUG: Prompt: {prompt[:100]}..." if len(prompt) > 100 else f"DEBUG: Prompt: {prompt}")
    print(f"DEBUG: First frame: {'Yes' if first_frame_image else 'No'}")
    print(f"DEBUG: Last frame: {'Yes' if last_frame_image else 'No'}")
    print(f"DEBUG: Resolution: {resolution}, Ratio: {ratio}, Duration: {duration}")
    print(f"DEBUG: Seed: {seed}, Camera Fixed: {camera_fixed}, Watermark: {watermark}")
    print(f"DEBUG: Generate Audio: {generate_audio}")
    
    if not ARK_API_KEY:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")
    
    try:
        # Import BytePlus SDK
        from byteplussdkarkruntime import Ark
        
        client = Ark(
            base_url=SEEDANCE_BASE_URL,
            api_key=ARK_API_KEY,
        )
        
        # Build prompt with parameters appended
        full_prompt = prompt
        
        # Append parameters as command-line style options
        if duration != 5:  # Only if not default
            full_prompt += f" --duration {duration}"
        if resolution and resolution != "720p":
            full_prompt += f" --rs {resolution}"
        if ratio:
            full_prompt += f" --rt {ratio}"
        if seed != -1:
            full_prompt += f" --seed {seed}"
        if camera_fixed and not first_frame_image:  # camerafixed not supported for I2V
            full_prompt += " --camerafixed true"
        if watermark:
            full_prompt += " --watermark true"
        
        print(f"DEBUG: Full prompt with params: {full_prompt}")
        
        # Build content array
        content = [
            {
                "type": "text",
                "text": full_prompt
            }
        ]
        
        # Add first frame image if provided (Image-to-Video)
        if first_frame_image:
            image_url = _prepare_image_for_api(first_frame_image)
            content.append({
                "type": "image_url",
                "image_url": {"url": image_url},
                "role": "first_frame"
            })
            print(f"DEBUG: Added first_frame image")
        
        # Add last frame image if provided
        if last_frame_image:
            image_url = _prepare_image_for_api(last_frame_image)
            content.append({
                "type": "image_url",
                "image_url": {"url": image_url},
                "role": "last_frame"
            })
            print(f"DEBUG: Added last_frame image")
        
        # Create video generation task
        print("-" * 30)
        print("DEBUG: Creating video generation task...")
        
        create_kwargs = {
            "model": actual_model,
            "content": content,
            "generate_audio": generate_audio  # Always pass explicitly
        }
        
        print(f"DEBUG: generate_audio = {generate_audio}")
        
        create_result = client.content_generation.tasks.create(**create_kwargs)
        
        task_id = create_result.id
        print(f"DEBUG: Task created, ID: {task_id}")
        
        # Poll for completion
        print("DEBUG: Polling for task completion...")
        max_attempts = 300  # 5 minutes max (1 second intervals)
        attempt = 0
        
        while attempt < max_attempts:
            get_result = client.content_generation.tasks.get(task_id=task_id)
            status = get_result.status
            
            if status == "succeeded":
                print(f"DEBUG: Task succeeded!")
                
                # Debug: Print full result structure
                print(f"DEBUG: get_result type: {type(get_result)}")
                
                # Extract video URL from result - use model_dump() for reliable access
                video_url = None
                video_duration = None
                
                # Method 1: Use model_dump() to get dict representation (most reliable)
                try:
                    result_dict = get_result.model_dump()
                    print(f"DEBUG: Result dict keys: {result_dict.keys()}")
                    print(f"DEBUG: Full result dict: {result_dict}")
                    
                    # Check content in dict
                    content = result_dict.get('content')
                    if content:
                        print(f"DEBUG: Content type: {type(content)}")
                        
                        # Content might be a dict or a list
                        if isinstance(content, dict):
                            # Single content object
                            if 'video_url' in content:
                                vu = content['video_url']
                                video_url = vu.get('url') if isinstance(vu, dict) else str(vu)
                            if 'url' in content:
                                video_url = content['url']
                        elif isinstance(content, list):
                            # List of content items
                            for item in content:
                                if isinstance(item, dict):
                                    if 'video_url' in item:
                                        vu = item['video_url']
                                        video_url = vu.get('url') if isinstance(vu, dict) else str(vu)
                                        break
                                    if 'url' in item:
                                        video_url = item['url']
                                        break
                        else:
                            # Content might be a string URL directly
                            video_url = str(content)
                    
                    # Check for direct video_url field in result
                    if not video_url and 'video_url' in result_dict:
                        vu = result_dict['video_url']
                        video_url = vu.get('url') if isinstance(vu, dict) else str(vu)
                    
                    # Check frames field (videos might be stored here)
                    if not video_url and result_dict.get('frames'):
                        frames = result_dict['frames']
                        print(f"DEBUG: Frames: {frames}")
                        if isinstance(frames, list) and frames:
                            video_url = frames[0] if isinstance(frames[0], str) else frames[0].get('url')
                    
                except Exception as e:
                    print(f"DEBUG: Error using model_dump: {e}")
                
                # Method 2: Try direct attribute access as fallback
                if not video_url:
                    try:
                        content = get_result.content
                        print(f"DEBUG: Direct content access type: {type(content)}")
                        print(f"DEBUG: Direct content attrs: {dir(content)}")
                        
                        # Try content.video_url
                        if hasattr(content, 'video_url'):
                            vu = content.video_url
                            video_url = vu.url if hasattr(vu, 'url') else str(vu)
                            print(f"DEBUG: Found content.video_url: {video_url}")
                        
                        # Try content.url
                        if not video_url and hasattr(content, 'url'):
                            video_url = content.url
                            print(f"DEBUG: Found content.url: {video_url}")
                        
                        # Try iterating if content is iterable
                        if not video_url and hasattr(content, '__iter__'):
                            for item in content:
                                if hasattr(item, 'video_url'):
                                    vu = item.video_url
                                    video_url = vu.url if hasattr(vu, 'url') else str(vu)
                                    break
                    except Exception as e:
                        print(f"DEBUG: Error with direct access: {e}")
                
                print(f"DEBUG: Final Video URL: {video_url}")
                print(f"DEBUG: Duration: {video_duration}")
                
                # Download video and save to disk
                saved_path = None
                video_base64 = None
                if video_url:
                    try:
                        video_response = requests.get(video_url)
                        video_response.raise_for_status()
                        video_bytes = video_response.content
                        saved_path = save_video_to_disk(video_bytes, actual_model)
                        video_base64 = base64.b64encode(video_bytes).decode('utf-8')
                    except Exception as e:
                        print(f"WARN: Failed to download/save video: {e}")
                
                return {
                    "status": "success",
                    "video_url": video_url,
                    "video_base64": video_base64,
                    "duration": video_duration,
                    "saved_path": saved_path,
                    "task_id": task_id
                }
                
            elif status == "failed":
                error_msg = getattr(get_result, 'error', 'Unknown error')
                print(f"DEBUG: Task failed: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Video generation failed: {error_msg}")
            
            else:
                # Still processing
                if attempt % 10 == 0:  # Log every 10 seconds
                    print(f"DEBUG: Status: {status}, attempt {attempt}/{max_attempts}")
                await asyncio.sleep(1)
                attempt += 1
        
        # Timeout
        raise HTTPException(status_code=504, detail="Video generation timed out after 5 minutes")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Video generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Test function
if __name__ == "__main__":
    import asyncio
    
    async def test():
        result = await generate_video_seedance(
            prompt="A drone flying through mountains at sunrise",
            duration=5,
            resolution="720p"
        )
        print(result)
    
    asyncio.run(test())
