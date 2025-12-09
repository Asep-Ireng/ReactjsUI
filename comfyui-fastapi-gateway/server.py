# server.py (FastAPI)
import json
import base64
import urllib.request as request
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

import asyncio
import threading
from comfyui import run_comfyui_dynamic as run_comfyui

class LoraConfig(BaseModel):
    name: str
    strength: float
    
class ControlNetPreviewRequest(BaseModel):
    server_address: str # Still needed for comfyui.py
    controlnet_ref_image_base64: str
    controlnet_preprocessors: Dict[str, bool]
    selected_anyline_style: Optional[str] = "lineart_realistic"
    cn_global_preprocessor_resolution: int = 1024
    # Add specific resolution fields if you want to pass them, otherwise comfyui.py will use global
    cn_anyline_resolution: Optional[int] = None
    cn_depth_resolution: Optional[int] = None
    cn_openpose_resolution: Optional[int] = None
    cn_canny_resolution: Optional[int] = None
from comfyui import run_controlnet_preview_only # We'll create this function



class GenerateRequest(BaseModel):
    server_address: str
    model_name: str
    positive_prompt: str
    negative_prompt: str
    random_seed: int
    steps: int
    clipskip: int
    loops: int
    cfg: float
    denoise: float
    width: int
    height: int
    sampler_name: str
    scheduler: str
    api_image_landscape: bool = False

    # Hires Fix
    hf_enable: bool = False
    hf_scale: Optional[float] = Field(default=1.5) # Changed to Optional
    hf_denoising_strength: Optional[float] = Field(default=0.4) # Changed to Optional
    hf_upscaler: Optional[str] = Field(default="RealESRGAN_x4") # Changed to Optional
    hf_colortransfer: str = "none"
    hf_steps: Optional[int] = 15
    hf_cfg: Optional[float] = 7.0
    hf_sampler: Optional[str] = None
    hf_scheduler: Optional[str] = None
    hf_temporal_size: Optional[int] = 64
    hf_temporal_overlap: Optional[int] = 8

    # Model Merge (NEW)
    model_merge_enabled: bool = False
    model2_name: Optional[str] = None
    model_merge_ratio: Optional[float] = 0.5

    # Sampling Discrete (NEW)
    sampling_discrete_enabled: bool = False
    sampling_type: Optional[str] = "eps"
    zsnr_enabled: bool = False

    # LoRAs
    loras_enabled: bool = False
    loras_config: List[LoraConfig] = Field(default_factory=list)

    # ControlNet - Updated structure
    controlnet_enabled: bool = False
    controlnet_model_name: Optional[str] = None
    controlnet_ref_image_base64: Optional[str] = None
    controlnet_strength: Optional[float] = Field(default=1.0) # Changed to Optional
    controlnet_preprocessors: Dict[str, bool] = Field(
        default_factory=lambda: {
            "lineart": True, "anyLine": True, "depth": True, "openPose": True, "canny": True
        }
    )
    selected_lineart_style: str = "lineart_realistic" # Default if not sent

    # ControlNet Preprocessor specific settings
    cn_anyline_resolution: Optional[int] = 1152
    cn_depth_model: Optional[str] = "depth_anything_v2_vitl.pth"
    cn_depth_resolution: Optional[int] = 1472
    cn_openpose_resolution: Optional[int] = 1024
    cn_canny_resolution: Optional[int] = 192

    # CLIP Vision
    clipvision_enabled: bool = False
    clipvision_model_name: Optional[str] = None
    clipvision_ref_image_base64: Optional[str] = None
    clipvision_strength: Optional[float] = Field(default=1.0) # Changed to Optional

    # Image Saver specific params
    output_filename_format: Optional[str] = "%time_%seed"
    output_path_format: Optional[str] = "%date"
    sampler_name_main_pass_for_saver: Optional[str] = None
    scheduler_main_pass_for_saver: Optional[str] = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    print("INFO: FastAPI /api/generate (HTTP POST) called")
    try:
        # Pydantic model now accepts None for Optional fields.
        # comfyui.py will handle these None values and apply defaults.
        params_dict = req.model_dump() # Pass Nones as is

        png_bytes = run_comfyui(**params_dict, progress_callback=None)

        if png_bytes is None:
            raise HTTPException(status_code=500, detail="Image generation failed in comfyui.py")

    except Exception as e:
        print(f"ERROR in /api/generate: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    b64 = base64.b64encode(png_bytes).decode("utf-8")
    return {"image": f"data:image/png;base64,{b64}"}

@app.post("/api/preview-controlnet-preprocessor")
async def preview_controlnet(req: ControlNetPreviewRequest):
    print("INFO: FastAPI /api/preview-controlnet-preprocessor called")
    try:
        params_dict = req.model_dump()
        
        # Call a new function in comfyui.py designed for this
        preview_image_bytes = run_controlnet_preview_only(**params_dict)

        if preview_image_bytes:
            b64_preview = base64.b64encode(preview_image_bytes).decode("utf-8")
            return {"image": f"data:image/png;base64,{b64_preview}"}
        else:
            # If run_controlnet_preview_only returns None without raising an error
            return {"error": "Preprocessor preview generation failed or returned no data."}

    except Exception as e:
        print(f"ERROR in /api/preview-controlnet-preprocessor: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        # Return error in JSON format
        return {"error": str(e)} # Or raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/get-samplers")
async def get_samplers():
    print("INFO: FastAPI /api/get-samplers called")
    try:
        # Fetch directly from ComfyUI
        with request.urlopen(f"http://192.168.50.106:8188/object_info/KSampler") as response:
            data = json.loads(response.read())
            # KSampler -> input -> required -> sampler_name -> [0] is the list
            samplers = data['KSampler']['input']['required']['sampler_name'][0]
            return {"samplers": samplers}
    except Exception as e:
        print(f"ERROR fetch samplers: {e}")
        return {"error": str(e)}

@app.get("/api/get-schedulers")
async def get_schedulers():
    print("INFO: FastAPI /api/get-schedulers called")
    try:
        # Fetch directly from ComfyUI
        with request.urlopen(f"http://192.168.50.106:8188/object_info/KSampler") as response:
            data = json.loads(response.read())
            # KSampler -> input -> required -> scheduler -> [0] is the list
            schedulers = data['KSampler']['input']['required']['scheduler'][0]
            return {"schedulers": schedulers}
    except Exception as e:
        print(f"ERROR fetch schedulers: {e}")
        return {"error": str(e)}
    
@app.websocket("/api/generate-ws")
async def generate_ws(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()
    print("INFO: FastAPI WebSocket connection accepted.")
    try:
        raw_params = await websocket.receive_json()
        print(f"DEBUG: FastAPI received raw_params keys via WebSocket: {list(raw_params.keys())}")
        if "controlnet_preprocessor_name" in raw_params: # Keep this warning if frontend might still send it
            print("WARN: Frontend sent deprecated 'controlnet_preprocessor_name'. It will be ignored. Please update frontend to send 'controlnet_preprocessors' and 'selected_anyline_style'.")

        try:
            params = GenerateRequest(**raw_params)
        except Exception as pydantic_error:
            error_msg = f"Invalid request parameters: {pydantic_error}"
            print(f"ERROR: FastAPI Pydantic validation failed: {error_msg}")
            if hasattr(pydantic_error, 'errors'):
                try:
                    detailed_errors = pydantic_error.errors() # type: ignore
                    error_msg += f" Details: {json.dumps(detailed_errors, indent=2)}"
                except:
                    pass
            await websocket.send_json({"type": "error", "message": error_msg})
            await websocket.close()
            return

        result_holder = {"image_bytes": None, "error": None}

        # MODIFIED progress_callback signature to include preview_kind
        def progress_callback(current_step, total_steps, preview_image_data_uri=None, preview_kind="step_preview"):
            percent = 0
            if total_steps > 0:
                 percent = int((current_step / total_steps) * 100)
            try:
                # Always send general progress
                payload_progress = {"type": "progress", "progress": percent, "current_step": current_step, "total_steps": total_steps}
                asyncio.run_coroutine_threadsafe(websocket.send_json(payload_progress), loop)

                if preview_image_data_uri:
                    # Determine the message type based on preview_kind
                    if preview_kind == "controlnet_preprocessor_output":
                        payload_preview = {"type": "controlnet_preprocessor_preview", "image": preview_image_data_uri}
                        print("DEBUG: FastAPI sending CN Preprocessor Preview to client")
                    elif preview_kind == "step_preview": # General step preview
                        payload_preview = {"type": "preview_image", "image": preview_image_data_uri}
                    else: # Fallback or other kinds of previews if you add more
                        payload_preview = {"type": "preview_image", "image": preview_image_data_uri, "kind": preview_kind}
                    
                    asyncio.run_coroutine_threadsafe(websocket.send_json(payload_preview), loop)

            except Exception as e_ws_send:
                # Avoid crashing the thread if WebSocket is already closed by client
                if not isinstance(e_ws_send, (RuntimeError, ConnectionResetError, WebSocketDisconnect)): # type: ignore
                    print(f"ERROR: FastAPI error sending progress/preview over WebSocket: {e_ws_send}")


        def run_job_in_thread():
            try:
                print("DEBUG: FastAPI run_job_in_thread started.")
                params_dict = params.model_dump() # Pass Nones as is, comfyui.py handles defaults
                
                image_bytes_result = run_comfyui(
                    **params_dict,
                    progress_callback=progress_callback # Pass the modified callback
                )
                result_holder["image_bytes"] = image_bytes_result
                print(f"DEBUG: FastAPI run_job_in_thread completed. Image bytes length: {len(image_bytes_result) if image_bytes_result else 'None'}")
            except Exception as e_job:
                print(f"ERROR: FastAPI exception in run_job_in_thread: {type(e_job).__name__} - {e_job}")
                import traceback
                traceback.print_exc()
                result_holder["error"] = f"{type(e_job).__name__}: {str(e_job)}"

        thread = threading.Thread(target=run_job_in_thread)
        thread.start()

        while thread.is_alive():
            await asyncio.sleep(0.1)
            if websocket.client_state == websocket.client_state.DISCONNECTED: # type: ignore
                print("INFO: FastAPI WebSocket detected client disconnect while job running.")
                break
        thread.join(timeout=10) 

        if thread.is_alive():
            print("WARN: FastAPI run_job_in_thread did not complete in time after loop exit.")
            # Optionally send a timeout error to the client if it's still connected
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                 await websocket.send_json({"type": "error", "message": "Processing timed out on server."})


        if result_holder["error"]:
            print(f"ERROR: FastAPI job failed with error: {result_holder['error']}")
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                await websocket.send_json({"type": "error", "message": result_holder["error"]})
        elif result_holder["image_bytes"]:
            b64 = base64.b64encode(result_holder["image_bytes"]).decode("utf-8")
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                await websocket.send_json({"type": "result", "image": f"data:image/png;base64,{b64}"})
                print("INFO: FastAPI successfully sent result image over WebSocket.")
        else: 
            msg = "Image generation failed or returned no data (and no specific error reported from thread)."
            print(f"ERROR: FastAPI job completed but: {msg}")
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                await websocket.send_json({"type": "error", "message": msg})

    except WebSocketDisconnect:
        print("INFO: FastAPI WebSocket disconnected by client (caught by WebSocketDisconnect).")
    except Exception as e:
        error_msg = f"Server error: {type(e).__name__} - {str(e)}"
        print(f"ERROR: FastAPI WebSocket outer error: {error_msg}")
        import traceback
        traceback.print_exc()
        try:
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                await websocket.send_json({"type": "error", "message": error_msg})
        except Exception as e_send_final:
            print(f"ERROR: FastAPI could not send final error to client: {e_send_final}")
    finally:
        try:
            if websocket.client_state != websocket.client_state.DISCONNECTED: # type: ignore
                await websocket.close()
                print("INFO: FastAPI WebSocket connection explicitly closed in finally block.")
        except Exception:
            pass