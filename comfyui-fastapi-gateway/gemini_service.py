import os
import io
import base64
import datetime
import uuid
import pathlib
from PIL import Image
from google import genai
from google.genai import types
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

# Model constants - User specified
MODEL_NANO_BANANA_PRO = "gemini-3-pro-image-preview" 
MODEL_NANO_BANANA = "gemini-2.5-flash-image"

# Global Chat Session State (for conversational continuity)
chat_session = None
current_chat_model = None

def reset_gemini_chat():
    """Resets the current chat session history."""
    global chat_session
    chat_session = None
    print("INFO: Gemini Chat Session Reset")

async def test_gemini_model(model_name: str) -> dict:
    """
    Test if a Gemini model name is valid by making a minimal API call.
    Returns: { success: bool, error?: str }
    """
    if not API_KEY:
        return {"success": False, "error": "GOOGLE_API_KEY not configured"}
    
    try:
        client = genai.Client(api_key=API_KEY)
        
        # Send a minimal text-only request to test model availability
        config = types.GenerateContentConfig(
            response_modalities=['TEXT'],
        )
        
        response = client.models.generate_content(
            model=model_name,
            contents="Hello, respond with just 'OK'.",
            config=config
        )
        
        # If we got here without exception, model exists
        return {"success": True, "message": f"Model '{model_name}' is accessible"}
    
    except Exception as e:
        error_str = str(e)
        if "404" in error_str:
            return {"success": False, "error": f"Model '{model_name}' not found"}
        if "403" in error_str:
            return {"success": False, "error": f"Access denied for model '{model_name}'"}
        return {"success": False, "error": error_str}

def _process_images(image_inputs: list) -> list:
    """Helper to process Base64/URL images into PIL Images."""
    images = []
    if not image_inputs:
        return images
    
    print(f"DEBUG: Processing {len(image_inputs)} images")
    for idx, image_input in enumerate(image_inputs):
        try:
            # Handle Image URL
            if image_input.startswith("http"):
                import requests
                print(f"DEBUG: Fetching image {idx+1} from URL")
                response = requests.get(image_input)
                response.raise_for_status()
                img = Image.open(io.BytesIO(response.content))
                images.append(img)
                print(f"DEBUG: Added image {idx+1} from URL, size: {img.size}")
            
            # Handle Base64
            else:
                if "," in image_input:
                    image_input = image_input.split(",")[1]
                
                # Fix Base64 padding
                image_input = "".join(image_input.split())
                image_input = image_input.rstrip("=")
                padding_needed = (4 - len(image_input) % 4) % 4
                if padding_needed:
                    image_input += "=" * padding_needed
                
                img_bytes = base64.b64decode(image_input)
                img = Image.open(io.BytesIO(img_bytes))
                images.append(img)
                print(f"DEBUG: Added image {idx+1} from Base64, size: {img.size}")
                
        except Exception as e:
            print(f"Error processing input image {idx+1}: {e}")
            import traceback
            traceback.print_exc()
    
    return images

def save_image_to_disk(image_data, model_name="gemini"):
    """
    Saves image (Base64 string or PIL Image) to output_api/{date}/image/{model}_{time}_{uid}.png
    Returns: Absolute path of saved file
    """
    try:
        # 1. Prepare Directory
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        output_dir = pathlib.Path("output_api") / today / "image"
        output_dir.mkdir(parents=True, exist_ok=True)  # Create if doesn't exist

        # 2. Prepare Filename
        timestamp = datetime.datetime.now().strftime("%H-%M-%S")
        short_id = str(uuid.uuid4())[:8]
        clean_model = model_name.replace(":", "").replace("/", "-").split("-")[-1] # Simplify model name
        filename = f"{clean_model}_{timestamp}_{short_id}.png"
        filepath = output_dir / filename

        # 3. Save Image
        if isinstance(image_data, Image.Image):
            image_data.save(filepath, format="PNG")
        elif isinstance(image_data, str):
            # Assumes Base64 string (with or without prefix)
            if "," in image_data:
                image_data = image_data.split(",")[1]
            # Fix padding if needed (reuse logic or assume logic elsewhere, but good to be safe)
            image_data = "".join(image_data.split())
            image_data = image_data.rstrip("=")
            padding_needed = (4 - len(image_data) % 4) % 4
            if padding_needed:
                image_data += "=" * padding_needed
                
            img_bytes = base64.b64decode(image_data)
            with open(filepath, "wb") as f:
                f.write(img_bytes)
        
        print(f"DEBUG: Saved image to: {filepath.absolute()}")
        return str(filepath.absolute())
    except Exception as e:
        print(f"ERROR: Failed to save image to disk: {e}")
        import traceback
        traceback.print_exc()
        return None

async def generate_image_gemini(
    prompt: str,
    model_alias: str = "flash",
    image_inputs: list = None,
    parameters: dict = None
):
    """
    Generates content (image + text/reasoning) using specific Gemini models.
    
    Strategy:
    - Multiple images (2+): Uses generate_content() for proper multi-image blending
    - Single/no image: Uses chat mode for conversational continuity with thought signatures
    """
    global chat_session, current_chat_model
    
    print(f"DEBUG: generate_image_gemini called with prompt length: {len(prompt)}")
    print(f"DEBUG: model_alias: {model_alias}")
    print(f"DEBUG: image_inputs count: {len(image_inputs) if image_inputs else 0}")
    print(f"DEBUG: parameters: {parameters}")

    if not API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured. Please add it to your .env file.")

    try:
        # Determine model - check for known aliases, otherwise use as actual model name
        known_aliases = {
            "flash": MODEL_NANO_BANANA,
            "pro": MODEL_NANO_BANANA_PRO,
        }
        
        if model_alias in known_aliases:
            target_model_name = known_aliases[model_alias]
        else:
            # Assume it's an actual model name (for custom models)
            target_model_name = model_alias
            print(f"DEBUG: Using custom model name: {target_model_name}")
        
        # Initialize Client
        client = genai.Client(api_key=API_KEY)

        # Get aspect ratio and resolution from parameters
        aspect_ratio = parameters.get("aspectRatio", "1:1") if parameters else "1:1"
        resolution = parameters.get("resolution", "1024x1024") if parameters else "1024x1024"
        
        # Map resolution to API format
        resolution_map = {
            "1024x1024": "1K",
            "2048x2048": "2K", 
            "4096x4096": "4K"
        }
        image_size = resolution_map.get(resolution, "1K")
        
        # Check if auto aspect ratio (let API decide)
        use_auto_aspect = aspect_ratio in ("auto", "original", "Auto")
        
        print(f"DEBUG: Model: {target_model_name}, Aspect: {aspect_ratio} (auto={use_auto_aspect}), Size: {image_size}")

        # Process images
        images = _process_images(image_inputs)
        
        # Note: Explicitly removed safety_settings - passing BLOCK_NONE was causing MORE censorship.
        # Letting the API use its defaults is often more permissive for authorized accounts.

        # Build config - skip ImageConfig if auto aspect ratio
        if use_auto_aspect:
            # Let API auto-detect aspect ratio from input images
            print("DEBUG: Using auto aspect ratio - no ImageConfig")
            config = types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        else:
            # Use explicit aspect ratio and size
            try:
                config = types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE'],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                        image_size=image_size
                    )
                )
                print(f"DEBUG: ImageConfig: aspect_ratio={aspect_ratio}, image_size={image_size}")
            except Exception as config_err:
                print(f"WARN: ImageConfig not supported: {config_err}")
                config = types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE']
                )

        # Determine API call mode:
        # - With images: Use generate_content() directly (official pattern for image editing)
        # - No images: Use chat mode for conversational continuity
        
        if images:
            # IMAGE EDITING MODE: generate_content() with [images..., prompt]
            # Following official pattern: contents=[sketch_image, text_input]
            print(f"INFO: Using generate_content() with {len(images)} images (image editing mode)")
            
            # Build contents: [image1, image2, ..., prompt] - IMAGES FIRST!
            contents = images + [prompt]
            
            response = client.models.generate_content(
                model=target_model_name,
                contents=contents,
                config=config
            )
        else:
            # TEXT-ONLY MODE: Use chat for conversational continuity
            print("INFO: Using CHAT mode (no images, text-only)")
            
            if chat_session is None or current_chat_model != target_model_name:
                print(f"INFO: Starting new chat session with {target_model_name}")
                chat_session = client.chats.create(
                    model=target_model_name,
                    config=config
                )
                current_chat_model = target_model_name
            else:
                print("INFO: Continuing existing chat session")
            
            response = chat_session.send_message([prompt])
        
        # Process response - handle different response formats
        generated_image_b64 = None
        thinking_parts = []  # List of {type: "text"|"image", content: ...}
        
        # Debug: Log full response structure
        print(f"DEBUG: Response type: {type(response).__name__}")
        try:
            response_attrs = [attr for attr in dir(response) if not attr.startswith('_')]
            print(f"DEBUG: Response attrs: {response_attrs[:15]}...")  # First 15
        except:
            pass
        
        # Debug: Check finish reason and safety
        if hasattr(response, 'candidates') and response.candidates:
            first_candidate = response.candidates[0]
            finish_reason = getattr(first_candidate, 'finish_reason', 'UNKNOWN')
            print(f"DEBUG: Finish Reason: {finish_reason}")
            
            # Optional: Print safety ratings if available
            if getattr(first_candidate, 'safety_ratings', None):
                # Simple print to avoid clutter, or iterate if needed
                print(f"DEBUG: Safety Ratings present: {len(first_candidate.safety_ratings)} ratings")

        # Get parts from response (handle different SDK response formats)
        parts = []
        if hasattr(response, 'parts') and response.parts:
            parts = list(response.parts)
        elif hasattr(response, 'candidates') and response.candidates:
            first_candidate = response.candidates[0]
            if hasattr(first_candidate, 'content') and first_candidate.content:
                if hasattr(first_candidate.content, 'parts') and first_candidate.content.parts:
                    parts = list(first_candidate.content.parts)
        
        print(f"DEBUG: Processing {len(parts)} parts")
        
        # Debug: log all part attributes
        for i, part in enumerate(parts):
            try:
                part_attrs = [attr for attr in dir(part) if not attr.startswith('_')]
                is_thought = getattr(part, 'thought', False) if hasattr(part, 'thought') else False
                has_text = bool(getattr(part, 'text', None)) if hasattr(part, 'text') else False
                has_inline = bool(getattr(part, 'inline_data', None)) if hasattr(part, 'inline_data') else False
                print(f"DEBUG: Part {i}: thought={is_thought}, has_text={has_text}, has_inline_data={has_inline}")
            except:
                pass
        
        if not parts:
            # Fallback: check for direct text
            if hasattr(response, 'text') and response.text:
                thinking_parts.append({"type": "text", "content": response.text})
                print("DEBUG: Got text from response.text fallback")

        for part in parts:
            is_thought = getattr(part, 'thought', False) if hasattr(part, 'thought') else False
            
            # Capture text (from both thoughts and regular parts)
            if hasattr(part, 'text') and part.text:
                if is_thought:
                    thinking_parts.append({"type": "text", "content": f"[Thought] {part.text}"})
                else:
                    thinking_parts.append({"type": "text", "content": part.text})
            
            # Try to extract image
            img_b64 = None
            try:
                if hasattr(part, 'inline_data') and part.inline_data:
                    if hasattr(part.inline_data, 'data') and part.inline_data.data:
                        img_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                        print(f"DEBUG: Extracted image via inline_data (thought={is_thought})")
                elif hasattr(part, 'as_image'):
                    # Official SDK helper
                    img = part.as_image()
                    if img:
                        buffered = io.BytesIO()
                        img.save(buffered, format="PNG")
                        img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                        print(f"DEBUG: Extracted image via as_image (thought={is_thought})")
            except Exception as e:
                print(f"DEBUG: inline_data extraction failed: {e}")
            
            if img_b64:
                # SAVE INTERIM IMAGE
                if is_thought:
                    print("DEBUG: Saving interim thought image...")
                    save_image_to_disk(img_b64, model_name=f"{target_model_name}_interim")
                    thinking_parts.append({"type": "image", "content": f"data:image/png;base64,{img_b64}"})
                else:
                    # Final image
                    generated_image_b64 = img_b64
                    print("DEBUG: Saving final generated image...")
                    save_image_to_disk(img_b64, model_name=target_model_name)
        
        # Convert thinking_parts to string for backwards compat
        thinking_text = ""
        for tp in thinking_parts:
            if tp["type"] == "text":
                thinking_text += tp["content"] + "\n"
            elif tp["type"] == "image":
                thinking_text += "[Interim Image]\n"  # Placeholder for now
        
        # Fallback: If no text but we have a finish reason (e.g. SAFETY/PROHIBITED), show it
        if not thinking_text.strip():
            candidate_reason = None
            if hasattr(response, 'candidates') and response.candidates:
                candidate_reason = getattr(response.candidates[0], 'finish_reason', None)
            
            # Check if reason is anything other than STOP (1) or None
            # STOP=1 usually means success or natural finish
            if candidate_reason and str(candidate_reason) != "1" and str(candidate_reason) != "FinishReason.STOP":
                 thinking_text = f"Generation Interrupted.\nReason: {candidate_reason}\n\nTry adjusting your prompt."

        result_payload = {
            "image": f"data:image/png;base64,{generated_image_b64}" if generated_image_b64 else None,
            "thinking_process": thinking_text.strip() if thinking_text else None
        }
        
        # DEBUG: Print Return Payload
        print("-" * 30)
        print("DEBUG: Payload Returning from Service")
        print(f"Image Present: {bool(result_payload['image'])}")
        if result_payload['image']:
             print(f"Image Data Length: {len(result_payload['image'])}")
        print(f"Thinking Process Length: {len(result_payload['thinking_process'] or '')}")
        print("-" * 30)
        
        return result_payload

    except Exception as e:
        print(f"Gemini API Error ({target_model_name}): {e}")
        import traceback
        traceback.print_exc()
        if "403" in str(e):
            raise HTTPException(status_code=403, detail=f"Access Denied for model '{target_model_name}'. Check API Key permissions.")
        if "404" in str(e):
            raise HTTPException(status_code=404, detail=f"Model '{target_model_name}' not found. Check preview access/SDK.")
        raise HTTPException(status_code=500, detail=str(e))
