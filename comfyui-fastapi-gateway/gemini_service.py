import os
import io
import base64
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

    if not API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured. Please add it to your .env file.")

    try:
        # Determine model
        if model_alias == "pro":
            target_model_name = MODEL_NANO_BANANA_PRO
        else:
            target_model_name = MODEL_NANO_BANANA
        
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
        response_attrs = [attr for attr in dir(response) if not attr.startswith('_')]
        print(f"DEBUG: Response attrs: {response_attrs[:15]}...")  # First 15
        
        # Check for candidates structure (official format)
        if hasattr(response, 'candidates') and response.candidates:
            print(f"DEBUG: Found {len(response.candidates)} candidates")
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                content = candidate.content
                print(f"DEBUG: Candidate content type: {type(content).__name__}")
                if hasattr(content, 'parts') and content.parts:
                    parts = list(content.parts)
                    print(f"DEBUG: Found {len(parts)} parts in candidate.content.parts")
        
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
            part_attrs = [attr for attr in dir(part) if not attr.startswith('_')]
            is_thought = getattr(part, 'thought', False) if hasattr(part, 'thought') else False
            has_text = bool(getattr(part, 'text', None)) if hasattr(part, 'text') else False
            has_inline = bool(getattr(part, 'inline_data', None)) if hasattr(part, 'inline_data') else False
            print(f"DEBUG: Part {i}: thought={is_thought}, has_text={has_text}, has_inline_data={has_inline}")
        
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
            except Exception as e:
                print(f"DEBUG: inline_data extraction failed: {e}")
            
            if img_b64:
                if is_thought:
                    # Interim thought image
                    thinking_parts.append({"type": "image", "content": f"data:image/png;base64,{img_b64}"})
                else:
                    # Final image
                    generated_image_b64 = img_b64
        
        # Convert thinking_parts to string for backwards compat
        thinking_text = ""
        for tp in thinking_parts:
            if tp["type"] == "text":
                thinking_text += tp["content"] + "\n"
            elif tp["type"] == "image":
                thinking_text += "[Interim Image]\n"  # Placeholder for now

        return {
            "image": f"data:image/png;base64,{generated_image_b64}" if generated_image_b64 else None,
            "thinking_process": thinking_text.strip() if thinking_text else None
        }

    except Exception as e:
        print(f"Gemini API Error ({target_model_name}): {e}")
        import traceback
        traceback.print_exc()
        if "403" in str(e):
            raise HTTPException(status_code=403, detail=f"Access Denied for model '{target_model_name}'. Check API Key permissions.")
        if "404" in str(e):
            raise HTTPException(status_code=404, detail=f"Model '{target_model_name}' not found. Check preview access/SDK.")
        raise HTTPException(status_code=500, detail=str(e))

