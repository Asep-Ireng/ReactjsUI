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

# Global Chat Session State
# Note: For a single-user local app, a global variable works. 
# For multi-user, this would need to be a dict keyed by session/user ID.
chat_session = None
current_chat_model = None

def reset_gemini_chat():
    """Resets the current chat session history."""
    global chat_session
    chat_session = None
    print("INFO: Gemini Chat Session Reset")

async def generate_image_gemini(
    prompt: str,
    model_alias: str = "flash",
    image_input: str = None, 
    parameters: dict = None
):
    """
    Generates content (image + text/reasoning) using specific Gemini models.
    Supports 'Nano Banana' (Flash) and 'Banana Pro' (Gemini 3).
    MAINTAINS STATE (Multi-Turn).
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

        # Config
        # SDK Compatibility Fix: 'image_config' unsupported, using prompt injection.
        aspect_ratio = parameters.get("aspectRatio", "1:1") if parameters else "1:1"
        if aspect_ratio and aspect_ratio != "1:1":
             prompt = f"{prompt} --aspect_ratio {aspect_ratio}"
             
        config = types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE'],
             # tools=[{"google_search": {}}] # Optional
        )

        # Prepare input
        message_contents = [prompt]
        if image_input:
            try:
                if "," in image_input:
                    image_input = image_input.split(",")[1]
                img_bytes = base64.b64decode(image_input)
                img = Image.open(io.BytesIO(img_bytes))
                message_contents.append(img)
            except Exception as e:
                print(f"Error processing input image: {e}")
                pass

        # Chat Session Logic
        # Check if we need a new session (first run OR model switch)
        if chat_session is None or current_chat_model != target_model_name:
            print(f"INFO: Starting new chat session with {target_model_name}")
            chat_session = client.chats.create(
                model=target_model_name,
                config=config
            )
            current_chat_model = target_model_name
        else:
            print("INFO: Continuing existing chat session")

        # Send Message
        response = chat_session.send_message(message_contents)
        
        generated_image_b64 = None
        thinking_process = ""

        # Normalize parts access (SDK v1.21.1)
        # Check candidates[0].content.parts
        parts = []
        if hasattr(response, 'candidates') and response.candidates:
             first_candidate = response.candidates[0]
             if hasattr(first_candidate, 'content') and first_candidate.content:
                 if hasattr(first_candidate.content, 'parts'):
                     parts = first_candidate.content.parts
        elif hasattr(response, 'parts'):
             parts = response.parts
        
        # Fallback text check
        if not parts and hasattr(response, 'text') and response.text:
             thinking_process = response.text
        
        for part in parts:
            if hasattr(part, 'text') and part.text:
                thinking_process += part.text + "\n"
            
            if hasattr(part, 'inline_data') and part.inline_data:
                 try:
                     if hasattr(part, 'as_image'):
                        img = part.as_image()
                        if img:
                            buffered = io.BytesIO()
                            img.save(buffered, format="PNG")
                            generated_image_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                     elif part.inline_data.data:
                         generated_image_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                 except Exception as e:
                     print(f"Error processing inline image part: {e}")
                     if part.inline_data.data:
                         generated_image_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')

        return {
            "image": f"data:image/png;base64,{generated_image_b64}" if generated_image_b64 else None,
            "thinking_process": thinking_process.strip() if thinking_process else None
        }

    except Exception as e:
        print(f"Gemini API Error ({target_model_name}): {e}")
        if "403" in str(e):
            raise HTTPException(status_code=403, detail=f"Access Denied for model '{target_model_name}'. Check API Key permissions.")
        if "404" in str(e):
             raise HTTPException(status_code=404, detail=f"Model '{target_model_name}' not found. Check preview access/SDK.")
        raise HTTPException(status_code=500, detail=str(e))
