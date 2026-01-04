import os
import io
import base64
import datetime
import uuid
import pathlib
import requests
from PIL import Image
from openai import OpenAI
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ARK_API_KEY = os.getenv("ARK_API_KEY")
SEEDREAM_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
SEEDREAM_MODEL = "seedream-4-5-251128"


async def test_seedream_model(model_name: str) -> dict:
    """
    Test if a Seedream model name is valid by making a minimal API call.
    Returns: { success: bool, error?: str }
    """
    if not ARK_API_KEY:
        return {"success": False, "error": "ARK_API_KEY not configured"}
    
    try:
        client = OpenAI(
            base_url=SEEDREAM_BASE_URL,
            api_key=ARK_API_KEY,
        )
        
        # Test with minimal prompt - just validating model access
        response = client.images.generate(
            model=model_name,
            prompt="test",
            size="2K",
            response_format="b64_json",
            extra_body={"watermark": False},
        )
        
        # If we got here without exception, model exists
        return {"success": True, "message": f"Model '{model_name}' is accessible"}
    
    except Exception as e:
        error_str = str(e)
        if "404" in error_str or "not found" in error_str.lower():
            return {"success": False, "error": f"Model '{model_name}' not found"}
        if "403" in error_str or "unauthorized" in error_str.lower():
            return {"success": False, "error": f"Access denied for model '{model_name}'"}
        return {"success": False, "error": error_str}

# Recommended resolutions for different aspect ratios (min 3.7M pixels)
ASPECT_RATIO_TO_SIZE = {
    "1:1": "2048x2048",
    "4:3": "2304x1728",
    "3:4": "1728x2304",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "21:9": "3024x1296",
}


def save_image_to_disk(image_data, model_name="seedream"):
    """
    Saves image (Base64 string or PIL Image) to output_api/{date}/{model}_{time}_{uid}.png
    Returns: Absolute path of saved file
    """
    try:
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        output_dir = pathlib.Path("output_api") / today
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%H-%M-%S")
        short_id = str(uuid.uuid4())[:8]
        clean_model = model_name.replace(":", "").replace("/", "-").split("-")[-1]
        filename = f"{clean_model}_{timestamp}_{short_id}.png"
        filepath = output_dir / filename

        if isinstance(image_data, Image.Image):
            image_data.save(filepath, format="PNG")
        elif isinstance(image_data, str):
            # Base64 string
            if "," in image_data:
                image_data = image_data.split(",")[1]
            image_data = "".join(image_data.split())
            image_data = image_data.rstrip("=")
            padding_needed = (4 - len(image_data) % 4) % 4
            if padding_needed:
                image_data += "=" * padding_needed
            img_bytes = base64.b64decode(image_data)
            with open(filepath, "wb") as f:
                f.write(img_bytes)

        print(f"DEBUG: Saved Seedream image to: {filepath.absolute()}")
        return str(filepath.absolute())
    except Exception as e:
        print(f"ERROR: Failed to save Seedream image: {e}")
        import traceback
        traceback.print_exc()
        return None


def _get_image_dimensions(image_input: str) -> tuple:
    """Extract width and height from a base64 or URL image."""
    try:
        if image_input.startswith("http"):
            response = requests.get(image_input)
            response.raise_for_status()
            img = Image.open(io.BytesIO(response.content))
        else:
            # Base64
            if "," in image_input:
                image_input = image_input.split(",")[1]
            image_input = "".join(image_input.split())
            image_input = image_input.rstrip("=")
            padding_needed = (4 - len(image_input) % 4) % 4
            if padding_needed:
                image_input += "=" * padding_needed
            img_bytes = base64.b64decode(image_input)
            img = Image.open(io.BytesIO(img_bytes))
        
        return img.width, img.height
    except Exception as e:
        print(f"ERROR: Failed to get image dimensions: {e}")
        return None, None


def _prepare_image_for_api(image_input: str) -> str:
    """
    Convert base64 image to URL or return URL as-is.
    Seedream API prefers URLs but can accept base64 with data: prefix.
    """
    if image_input.startswith("http"):
        return image_input
    else:
        # Return as data URL for API
        if not image_input.startswith("data:"):
            return f"data:image/png;base64,{image_input}"
        return image_input


async def generate_image_seedream(
    prompt: str,
    model_name: str = None,  # The actual API model identifier
    image_inputs: list = None,
    parameters: dict = None
):
    """
    Generates images using Seedream API.
    
    Parameters:
        prompt: Text description
        model_name: API model identifier (e.g., 'seedream-4-0-250828', 'seedream-4-5-251128')
        image_inputs: List of base64/URL images for reference
        parameters: {
            resolution: "auto", "2K", "4K", "from_image_1", "from_image_2", or "WxH"
            aspectRatio: "1:1", "16:9", etc. (used if resolution is manual)
        }
    """
    # Use provided model_name or fall back to default
    actual_model = model_name or SEEDREAM_MODEL
    
    print(f"DEBUG: generate_image_seedream called")
    print(f"DEBUG: Using model: {actual_model}")
    print(f"DEBUG: prompt length: {len(prompt)}")
    print(f"DEBUG: image_inputs count: {len(image_inputs) if image_inputs else 0}")
    
    # Log resolution for each input image
    if image_inputs:
        for i, img in enumerate(image_inputs):
            w, h = _get_image_dimensions(img)
            if w and h:
                pixels = w * h
                print(f"DEBUG: Image {i+1}: {w}x{h} ({pixels:,} pixels)")
            else:
                print(f"DEBUG: Image {i+1}: Could not get dimensions")
    
    print(f"DEBUG: parameters: {parameters}")

    if not ARK_API_KEY:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured. Please add it to your .env file.")

    try:
        client = OpenAI(
            base_url=SEEDREAM_BASE_URL,
            api_key=ARK_API_KEY,
        )

        # Determine size parameter
        resolution = parameters.get("resolution", "auto") if parameters else "auto"
        
        # Strip 'custom:' prefix if present (sent from frontend custom input)
        if resolution.startswith("custom:"):
            resolution = resolution.replace("custom:", "")
            print(f"DEBUG: Stripped custom prefix, resolution: {resolution}")
        
        size = None  # None means auto (model decides)

        # Parse resolution constraints from parameters (sent from frontend model config)
        def _parse_resolution_to_pixels(res_str: str, default: int) -> int:
            """Convert 'WxH' string to total pixels, or return default."""
            if not res_str:
                return default
            try:
                parts = res_str.lower().split('x')
                if len(parts) == 2:
                    return int(parts[0]) * int(parts[1])
            except:
                pass
            return default

        # Get min/max from parameters, with Seedream 4.5 defaults
        min_res_str = parameters.get("minResolution") if parameters else None
        max_res_str = parameters.get("maxResolution") if parameters else None
        MIN_PIXELS = _parse_resolution_to_pixels(min_res_str, 3686400)   # Default: ~1920x1920
        MAX_PIXELS = _parse_resolution_to_pixels(max_res_str, 16777216)  # Default: 4096x4096
        
        print(f"DEBUG: Resolution constraints - Min: {MIN_PIXELS:,} px, Max: {MAX_PIXELS:,} px")

        def _validate_and_adjust_dimensions(w: int, h: int) -> tuple:
            """
            Validates and adjusts dimensions to meet Seedream requirements:
            - Total pixels: [MIN_PIXELS - MAX_PIXELS]
            - Aspect ratio: [1/16 - 16]
            Returns: (adjusted_w, adjusted_h, is_valid, message)
            """
            MIN_RATIO = 1/16
            MAX_RATIO = 16
            
            original_w, original_h = w, h
            total_pixels = w * h
            aspect_ratio = w / h if h > 0 else 1
            
            # Check aspect ratio first
            if aspect_ratio < MIN_RATIO or aspect_ratio > MAX_RATIO:
                print(f"WARN: Aspect ratio {aspect_ratio:.4f} out of range [{MIN_RATIO}-{MAX_RATIO}]")
                # Can't fix aspect ratio automatically - user needs to choose different image
                return w, h, False, f"Aspect ratio {aspect_ratio:.2f} is outside valid range (1:16 to 16:1)"
            
            # Scale up if below minimum
            if total_pixels < MIN_PIXELS:
                scale = (MIN_PIXELS / total_pixels) ** 0.5
                w = int(w * scale) + 1  # +1 to ensure we're above minimum
                h = int(h * scale) + 1
                total_pixels = w * h
                print(f"DEBUG: Scaled up from {original_w}x{original_h} to {w}x{h} ({total_pixels:,} pixels)")
            
            # Scale down if above maximum
            if total_pixels > MAX_PIXELS:
                scale = (MAX_PIXELS / total_pixels) ** 0.5
                w = int(w * scale)
                h = int(h * scale)
                total_pixels = w * h
                print(f"DEBUG: Scaled down from {original_w}x{original_h} to {w}x{h} ({total_pixels:,} pixels)")
            
            # Final validation
            if total_pixels < MIN_PIXELS or total_pixels > MAX_PIXELS:
                return w, h, False, f"Could not adjust dimensions to valid range"
            
            return w, h, True, f"Valid: {w}x{h} ({total_pixels:,} pixels)"

        if resolution == "auto":
            # Skip size param entirely
            print("DEBUG: Using auto resolution - model will decide")
            size = None
        elif resolution == "2K":
            size = "2K"
        elif resolution == "4K":
            size = "4K"
        elif resolution == "from_image_1" and image_inputs and len(image_inputs) >= 1:
            w, h = _get_image_dimensions(image_inputs[0])
            if w and h:
                w, h, is_valid, msg = _validate_and_adjust_dimensions(w, h)
                if is_valid:
                    size = f"{w}x{h}"
                    print(f"DEBUG: Using resolution from image 1: {size}")
                else:
                    print(f"WARN: {msg}, falling back to 2K")
                    size = "2K"
            else:
                size = "2K"  # Fallback
        elif resolution == "from_image_2" and image_inputs and len(image_inputs) >= 2:
            w, h = _get_image_dimensions(image_inputs[1])
            if w and h:
                w, h, is_valid, msg = _validate_and_adjust_dimensions(w, h)
                if is_valid:
                    size = f"{w}x{h}"
                    print(f"DEBUG: Using resolution from image 2: {size}")
                else:
                    print(f"WARN: {msg}, falling back to 2K")
                    size = "2K"
            else:
                size = "2K"
        elif "x" in resolution:
            # Manual WxH - validate it
            try:
                parts = resolution.lower().split("x")
                w, h = int(parts[0]), int(parts[1])
                w, h, is_valid, msg = _validate_and_adjust_dimensions(w, h)
                if is_valid:
                    size = f"{w}x{h}"
                    print(f"DEBUG: Manual resolution validated: {size}")
                else:
                    print(f"WARN: {msg}, falling back to 2K")
                    size = "2K"
            except Exception as e:
                print(f"WARN: Could not parse manual resolution '{resolution}': {e}")
                size = "2K"
        else:
            # Check if it's an aspect ratio
            aspect_ratio = parameters.get("aspectRatio") if parameters else None
            if aspect_ratio and aspect_ratio in ASPECT_RATIO_TO_SIZE:
                size = ASPECT_RATIO_TO_SIZE[aspect_ratio]
                print(f"DEBUG: Using preset for aspect ratio {aspect_ratio}: {size}")
            else:
                size = "2K"

        # Prepare extra_body
        extra_body = {
            "watermark": False,
            "sequential_image_generation": "disabled",  # Single image output
        }

        # Add images if provided
        if image_inputs and len(image_inputs) > 0:
            prepared_images = [_prepare_image_for_api(img) for img in image_inputs]
            if len(prepared_images) == 1:
                extra_body["image"] = prepared_images[0]
            else:
                extra_body["image"] = prepared_images
            print(f"DEBUG: Added {len(prepared_images)} reference image(s)")

        # Build API call kwargs
        api_kwargs = {
            "model": actual_model,  # Use the model passed from request
            "prompt": prompt,
            "response_format": "b64_json",  # Get base64 directly
            "extra_body": extra_body,
        }

        # Only add size if not auto
        if size:
            api_kwargs["size"] = size
            print(f"DEBUG: Size set to: {size}")
        else:
            print("DEBUG: No size param - using auto")

        print(f"DEBUG: Calling Seedream API...")
        response = client.images.generate(**api_kwargs)

        print(f"DEBUG: Response received")
        print(f"DEBUG: Generated {len(response.data)} image(s)")

        # Extract the generated image
        generated_image_b64 = None
        if response.data and len(response.data) > 0:
            first_result = response.data[0]
            if hasattr(first_result, 'b64_json') and first_result.b64_json:
                generated_image_b64 = first_result.b64_json
                print(f"DEBUG: Got base64 image, length: {len(generated_image_b64)}")
                
                # Save to disk
                save_image_to_disk(generated_image_b64, model_name=SEEDREAM_MODEL)
            elif hasattr(first_result, 'url') and first_result.url:
                # If URL format, download and convert
                print(f"DEBUG: Got URL response, downloading...")
                img_response = requests.get(first_result.url)
                img_response.raise_for_status()
                generated_image_b64 = base64.b64encode(img_response.content).decode('utf-8')
                save_image_to_disk(generated_image_b64, model_name=SEEDREAM_MODEL)

        # Build result
        result_payload = {
            "image": f"data:image/png;base64,{generated_image_b64}" if generated_image_b64 else None,
            "thinking_process": None,  # Seedream doesn't have reasoning output
        }

        print("-" * 30)
        print("DEBUG: Payload Returning from Seedream Service")
        print(f"Image Present: {result_payload['image'] is not None}")
        print("-" * 30)

        return result_payload

    except Exception as e:
        print(f"ERROR: Seedream API call failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
