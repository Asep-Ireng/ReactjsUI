import json
from urllib import request, parse
import os
from typing import Dict, Any, Optional, List
import uuid
import websocket
import socket # For socket.timeout
import base64
import time # For os.times().elapsed if needed on other platforms
from dotenv import load_dotenv
import json

load_dotenv()
# --- Path to ComfyUI's input directory (for saving reference images) ---
COMFYUI_BASE_PATH = os.getenv("COMFYUI_BASE_PATH")
if not COMFYUI_BASE_PATH or not os.path.isdir(COMFYUI_BASE_PATH):
    raise ValueError("FATAL: COMFYUI_BASE_PATH is not set or is not a valid directory. Please check your .env file.")

COMFYUI_INPUT_PATH = os.path.join(COMFYUI_BASE_PATH, "input")
# ---

def save_base64_image_to_input(base64_str_with_header: Optional[str], prefix="ref_") -> Optional[str]:
    if not base64_str_with_header:
        return None
    try:
        os.makedirs(COMFYUI_INPUT_PATH, exist_ok=True)
        if ',' not in base64_str_with_header:
            print(f"ERROR: Invalid base64 header in string: {base64_str_with_header[:60]}...")
            return None
        header, encoded_data = base64_str_with_header.split(',', 1)
        image_data = base64.b64decode(encoded_data)
        
        mime_type_part = header.split(';')[0]
        if '/' not in mime_type_part:
            print(f"ERROR: Invalid mime type in base64 header: {mime_type_part}")
            extension = 'png' # fallback
        else:
            extension = mime_type_part.split('/')[-1]

        if not extension or extension == 'octet-stream': extension = 'png'
        
        filename = f"{prefix}{uuid.uuid4().hex}.{extension}"
        filepath = os.path.join(COMFYUI_INPUT_PATH, filename)
        with open(filepath, "wb") as f: f.write(image_data)
        print(f"DEBUG: Saved reference image to: {filepath}")
        return filename
    except base64.binascii.Error as b64_error:
        print(f"ERROR: Invalid base64 data: {b64_error}. String was: {base64_str_with_header[:100]}...")
        return None
    except Exception as e:
        print(f"ERROR: Saving base64 image to {COMFYUI_INPUT_PATH}: {e}")
        return None

class ComfyUIAPIGenerator:
    def __init__(self, server_address: str = "127.0.0.1:8188", client_id="debug_client_id"):
        self.server_address = server_address
        self.client_id = client_id
        self.nodes: Dict[str, Any] = {}
        self.current_node_id_counter = 0
        # These will be set by build_workflow
        # self.cn_preview_node_id: Optional[str] = None 
        # self.final_image_saver_node_id: Optional[str] = None 
        print(f"DEBUG: ComfyUIAPIGenerator initialized for client_id: {self.client_id} (Dynamic Workflow)")

    def _get_next_node_id(self) -> str:
        self.current_node_id_counter += 1
        return str(self.current_node_id_counter)

    def _add_node(self, class_type: str, inputs: Dict[str, Any], title: Optional[str] = None) -> tuple[str, list]:
        node_id = self._get_next_node_id()
        self.nodes[node_id] = {"class_type": class_type, "inputs": inputs}
        if title: self.nodes[node_id]["_meta"] = {"title": title}
        return node_id, [node_id, 0]
    
    def build_workflow(self, params: Dict[str, Any]) -> tuple[Dict[str, Any], Optional[str]]: # Explicitly return tuple
        self.nodes = {}
        self.current_node_id_counter = 0
        # Initialize cn_preprocessor_preview_node_id at the beginning of the method
        cn_preprocessor_preview_node_id: Optional[str] = None
        # Initialize final_image_saver_node_id (though not strictly needed for this error, good practice)
        # final_image_saver_node_id: Optional[str] = None 

        print(f"DEBUG: [{self.client_id}] Building FULL workflow. Params keys: {list(params.keys())}")

        # --- Parameter Defaulting ---
        actual_hf_scale = params.get("hf_scale") if params.get("hf_scale") is not None else 1.5
        actual_hf_denoising_strength = params.get("hf_denoising_strength") if params.get("hf_denoising_strength") is not None else 0.4
        actual_hf_upscaler = params.get("hf_upscaler") if params.get("hf_upscaler") is not None else "RealESRGAN_x4"
        actual_hf_steps = params.get("hf_steps") if params.get("hf_steps") is not None else 15
        actual_hf_cfg = params.get("hf_cfg") if params.get("hf_cfg") is not None else 7.0
        actual_hf_sampler = params.get("hf_sampler")
        actual_hf_scheduler = params.get("hf_scheduler")
        actual_hf_colortransfer = params.get("hf_colortransfer", "none")

        actual_controlnet_strength = params.get("controlnet_strength") if params.get("controlnet_strength") is not None else 1.0
        actual_selected_anyline_style = params.get("selected_anyline_style", "lineart_realistic")
        actual_cn_anyline_resolution = params.get("cn_anyline_resolution") if params.get("cn_anyline_resolution") is not None else 1152
        actual_cn_depth_model = params.get("cn_depth_model") if params.get("cn_depth_model") is not None else "depth_anything_v2_vitl.pth"
        actual_cn_depth_resolution = params.get("cn_depth_resolution") if params.get("cn_depth_resolution") is not None else 1472
        actual_cn_openpose_resolution = params.get("cn_openpose_resolution") if params.get("cn_openpose_resolution") is not None else 1024
        actual_cn_canny_resolution = params.get("cn_canny_resolution") if params.get("cn_canny_resolution") is not None else 192
        
        actual_clipvision_strength = params.get("clipvision_strength") if params.get("clipvision_strength") is not None else 1.0
        actual_clipskip=params.get("clipskip") if params.get("clipskip") is not None else 0

        actual_output_filename_format = params.get("output_filename_format") if params.get("output_filename_format") is not None else "%time_%seed"
        actual_output_path_format = params.get("output_path_format") if params.get("output_path_format") is not None else "%date"
        actual_sampler_name_main_pass_for_saver = params.get("sampler_name_main_pass_for_saver") if params.get("sampler_name_main_pass_for_saver") is not None else params["sampler_name"]
        actual_scheduler_main_pass_for_saver = params.get("scheduler_main_pass_for_saver") if params.get("scheduler_main_pass_for_saver") is not None else params["scheduler"]
        # --- End Parameter Defaulting ---

        # 1. Checkpoint Loader
        ckpt_loader_id, _ = self._add_node(
            "Checkpoint Loader with Name (Image Saver)",
            {"ckpt_name": params["model_name"]},
            "Load Checkpoint & Name"
        )
        current_model_ref = [ckpt_loader_id, 0]
        current_clip_ref = [ckpt_loader_id, 1]
        base_vae_ref = [ckpt_loader_id, 2]
        ckpt_model_name_str_ref = [ckpt_loader_id, 3]

        # 2. LoRA Stack
        if params.get("loras_enabled") and params.get("loras_config"):
            for lora_info in params["loras_config"]:
                lora_name = lora_info.get("name")
                lora_strength = float(lora_info.get("strength", 1.0))
                if not lora_name or lora_name == "none": continue
                lora_name_for_comfyui = lora_name.replace("/", "\\")
                lora_loader_id, _ = self._add_node("LoraLoader", {
                    "lora_name": lora_name_for_comfyui, "strength_model": lora_strength, "strength_clip": lora_strength,
                    "model": current_model_ref, "clip": current_clip_ref,
                }, f"Load LoRA: {os.path.basename(lora_name)}")
                current_model_ref, current_clip_ref = [lora_loader_id, 0], [lora_loader_id, 1]
        
        # 3. Base Text Prompts
        pos_text_encode_id, base_pos_cond_ref = self._add_node("CLIPTextEncode", {
            "text": params["positive_prompt"], "clip": current_clip_ref
        }, "Base Positive Encode")
        neg_text_encode_id, base_neg_cond_ref = self._add_node("CLIPTextEncode", {
            "text": params["negative_prompt"], "clip": current_clip_ref
        }, "Base Negative Encode")

        final_positive_for_ksampler = base_pos_cond_ref
        final_negative_for_ksampler = base_neg_cond_ref
        latent_for_ksampler_ref = None
        clipvision_output_for_cn_ref = None

        if params.get("clipvision_enabled") and params.get("clipvision_ref_image_filename") and params.get("clipvision_model_name"):
            print(f"DEBUG: [{self.client_id}] CLIPVision Path Enabled.")
            cv_load_image_id, cv_loaded_image_ref = self._add_node("LoadImage", {"image": params["clipvision_ref_image_filename"]}, "CV Load Ref Image")
            cv_loader_id, cv_clip_vision_model_ref = self._add_node("CLIPVisionLoader", {"clip_name": params["clipvision_model_name"]}, "Load CLIP Vision Model")
            cv_encode_id, cv_encoded_output_ref = self._add_node("CLIPVisionEncode", {
                "clip_vision": cv_clip_vision_model_ref, "image": cv_loaded_image_ref, "crop": "center"
            }, "CLIP Vision Encode")
            unclip_cond_id, unclip_output_cond_ref = self._add_node("unCLIPConditioning", {
                "conditioning": base_pos_cond_ref,
                "clip_vision_output": cv_encoded_output_ref,
                "strength": actual_clipvision_strength, "noise_augmentation": 0.0
            }, "unCLIPConditioning")
            clipvision_output_for_cn_ref = unclip_output_cond_ref
            vae_encode_cv_id, vae_encoded_latent_ref = self._add_node("VAEEncode", {
                "pixels": cv_loaded_image_ref, "vae": base_vae_ref
            }, "VAE Encode (CV Ref Image for Latent)")
            latent_for_ksampler_ref = vae_encoded_latent_ref
        
        if params.get("controlnet_enabled") and params.get("controlnet_model_name") and params.get("controlnet_ref_image_filename"):
            print(f"DEBUG: [{self.client_id}] ControlNet Path Enabled.")
            cn_load_image_id, cn_loaded_image_ref = self._add_node("LoadImage", {"image": params["controlnet_ref_image_filename"]}, "CN Load Ref Image")
            
            current_image_for_cn_processing = cn_loaded_image_ref
            cn_preprocessors_config = params.get("controlnet_preprocessors", {})
            processed_image_available = False

            if cn_preprocessors_config.get("anyLine"):
                print(f"DEBUG: [{self.client_id}] CN: Applying AnyLine (Style: {actual_selected_anyline_style})")
                anyline_prep_id, lineart_output_ref = self._add_node(
                    "AnyLineArtPreprocessor_aux", {
                        "image": current_image_for_cn_processing,
                        "merge_with_lineart": actual_selected_anyline_style,
                        "resolution": actual_cn_anyline_resolution,
                        "lineart_lower_bound": 0.0, "lineart_upper_bound": 1.0,
                        "object_min_size": 36, "object_connectivity": 1
                    }, "CN: AnyLineArt Style Prep")
                current_image_for_cn_processing = lineart_output_ref
                processed_image_available = True

            if cn_preprocessors_config.get("depth"):
                print(f"DEBUG: [{self.client_id}] CN: Applying Depth Preprocessor")
                depth_prep_id, depth_output_ref = self._add_node(
                    "DepthAnythingV2Preprocessor", {
                        "image": current_image_for_cn_processing, 
                        "ckpt_name": actual_cn_depth_model, 
                        "resolution": actual_cn_depth_resolution
                    }, "CN: Depth Prep")
                current_image_for_cn_processing = depth_output_ref
                processed_image_available = True

            if cn_preprocessors_config.get("openPose"):
                print(f"DEBUG: [{self.client_id}] CN: Applying OpenPose Preprocessor")
                openpose_prep_id, openpose_output_ref = self._add_node(
                    "OpenposePreprocessor", {
                        "image": current_image_for_cn_processing, 
                        "resolution": actual_cn_openpose_resolution,
                        "detect_hand":"enable", "detect_body":"enable", "detect_face":"enable", 
                        "scale_stick_for_xinsr_cn":"disable"
                    }, "CN: OpenPose Prep")
                current_image_for_cn_processing = openpose_output_ref
                processed_image_available = True

            if cn_preprocessors_config.get("canny"):
                print(f"DEBUG: [{self.client_id}] CN: Applying Canny Preprocessor")
                canny_prep_id, canny_output_ref = self._add_node(
                    "CannyEdgePreprocessor", {
                        "image": current_image_for_cn_processing, 
                        "low_threshold": 100, "high_threshold": 200, 
                        "resolution": actual_cn_canny_resolution
                    }, "CN: Canny Prep")
                current_image_for_cn_processing = canny_output_ref
                processed_image_available = True
            
            final_image_for_cn_apply = current_image_for_cn_processing if processed_image_available else cn_loaded_image_ref

            if final_image_for_cn_apply:
                preview_node_id_val, _ = self._add_node(
                    "PreviewImage",
                    {"images": final_image_for_cn_apply},
                    "CN Preprocessor Output Preview"
                )
                cn_preprocessor_preview_node_id = preview_node_id_val # Assign the ID

            cn_loader_id, cn_model_ref = self._add_node("ControlNetLoader", {"control_net_name": params["controlnet_model_name"]}, "Load ControlNet Model")
            positive_for_cn_apply = clipvision_output_for_cn_ref if clipvision_output_for_cn_ref else base_pos_cond_ref
            cn_apply_id, _ = self._add_node("ControlNetApplyAdvanced", {
                "positive": positive_for_cn_apply, "negative": base_neg_cond_ref,
                "control_net": cn_model_ref, "image": final_image_for_cn_apply,
                "strength": actual_controlnet_strength, "start_percent": 0.0, "end_percent": 1.0
            }, "Apply ControlNet")
            final_positive_for_ksampler = [cn_apply_id, 0]
            final_negative_for_ksampler = [cn_apply_id, 1]
        elif clipvision_output_for_cn_ref:
             final_positive_for_ksampler = clipvision_output_for_cn_ref

        if latent_for_ksampler_ref is None:
            print(f"DEBUG: [{self.client_id}] Normal Latent Path (No CLIPVision).")
            canvas_inputs = {
                "Width": params["width"], "Height": params["height"], "Batch": 1,
                "Landscape": params.get("api_image_landscape", False),
                "HiResMultiplier": actual_hf_scale
            }
            canvas_node_id, _ = self._add_node("CanvasCreatorAdvanced", canvas_inputs, "Create Canvas Advanced")
            empty_latent_id, latent_for_ksampler_ref = self._add_node("EmptyLatentImage", {
                "width": [canvas_node_id, 0], "height": [canvas_node_id, 1], "batch_size": 1
            }, "Empty Latent Image")

        if latent_for_ksampler_ref is None: raise ValueError("Latent for KSampler is None after all checks.")
        steps_cfg_node_id, _ = self._add_node("StepsAndCfg", {"steps": params["steps"], "cfg": params["cfg"]}, "Steps & Cfg (Main)")
        main_ksampler_id, main_ksampler_latent_out_ref = self._add_node("KSampler", {
            "model": current_model_ref, "positive": final_positive_for_ksampler, "negative": final_negative_for_ksampler,
            "latent_image": latent_for_ksampler_ref, "seed": params["random_seed"],
            "steps": [steps_cfg_node_id, 0], "cfg": [steps_cfg_node_id, 1],
            "sampler_name": params["sampler_name"], "scheduler": params["scheduler"], "denoise": 1.0
        }, "KSampler (Main)")
        initial_decode_id, initial_pixels_ref = self._add_node("VAEDecode", {
            "samples": main_ksampler_latent_out_ref, "vae": base_vae_ref
        }, "Initial VAE Decode")
        final_pixels_for_save_ref = initial_pixels_ref

        if params.get("hf_enable"):
            print(f"DEBUG: [{self.client_id}] Hires Fix Path Enabled.")
            hf_upscaler_name_to_load = actual_hf_upscaler
            if not hf_upscaler_name_to_load.lower().endswith(('.pth', '.safetensors')):
                 hf_upscaler_name_to_load += ".pth"
            hf_upscaler_loader_id, hf_upscaler_model_ref = self._add_node("UpscaleModelLoader", {"model_name": hf_upscaler_name_to_load}, "Hires: Load Upscaler")
            hf_upscaled_image_id, hf_upscaled_pixels_ref = self._add_node("UpscaleImageByModelThenResize", {
                "upscale_model": hf_upscaler_model_ref, "image": initial_pixels_ref,
                "resize_scale": actual_hf_scale, "resize_method": "nearest"
            }, "Hires: Upscale Image")
            hf_vae_encode_id, hf_encoded_latent_ref = self._add_node("VAEEncodeTiled", {
                "pixels": hf_upscaled_pixels_ref, "vae": base_vae_ref,
                "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8
            }, "Hires: VAEEncodeTiled")
            model_for_hires_sampler = [ckpt_loader_id, 0]
            hf_ksampler_id, hf_ksampler_latent_out_ref = self._add_node("KSampler", {
                "model": model_for_hires_sampler,
                "positive": final_positive_for_ksampler, "negative": final_negative_for_ksampler,
                "latent_image": hf_encoded_latent_ref, "seed": params["random_seed"],
                "steps": actual_hf_steps, "cfg": actual_hf_cfg,
                "sampler_name": actual_hf_sampler if actual_hf_sampler is not None else params["sampler_name"],
                "scheduler": actual_hf_scheduler if actual_hf_scheduler is not None else params["scheduler"],
                "denoise": actual_hf_denoising_strength
            }, "Hires: KSampler")
            hf_final_decode_id, hf_final_pixels_ref = self._add_node("VAEDecodeTiled", {
                "samples": hf_ksampler_latent_out_ref, "vae": base_vae_ref,
                "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8
            }, "Hires: VAEDecodeTiled (Final)")
            final_pixels_for_save_ref = hf_final_pixels_ref
            if actual_hf_colortransfer != "none":
                print(f"DEBUG: [{self.client_id}] Applying Hires Color Transfer: {actual_hf_colortransfer}")
                ct_id, ct_output_ref = self._add_node("ImageColorTransferMira", {
                    "src_image": hf_final_pixels_ref, "ref_image": initial_pixels_ref,
                    "method": actual_hf_colortransfer
                }, "Hires: Color Transfer")
                final_pixels_for_save_ref = ct_output_ref
        
        if final_pixels_for_save_ref is None: raise ValueError("final_pixels_for_save_ref is None before Image Saver.")
        image_saver_inputs = {
            "images": final_pixels_for_save_ref,
            "filename": actual_output_filename_format,
            "path": actual_output_path_format, "extension": "png",
            "steps": [steps_cfg_node_id, 0], "cfg": [steps_cfg_node_id, 1],  
            "modelname": ckpt_model_name_str_ref, 
            "sampler_name": actual_sampler_name_main_pass_for_saver,
            "scheduler": actual_scheduler_main_pass_for_saver,
            "positive": params["positive_prompt"], "negative": params["negative_prompt"], 
            "seed_value": params["random_seed"],
            "width": params["width"], "height": params["height"],
            "lossless_webp": True, "quality_jpeg_or_webp": 100, "optimize_png": False, "counter": 0,
            "denoise": 1.0, "clip_skip": -2, "time_format": "%Y-%m-%d-%H%M%S",
            "save_workflow_as_json": False, "embed_workflow": True,
            "additional_hashes": "", "download_civitai_data": True, "easy_remix": True
        }
        # Store the ID of the final image saver node
        final_image_saver_node_id_val, _ = self._add_node("Image Saver", image_saver_inputs, "FINAL_IMAGE_SAVER_NODE")
        # self.final_image_saver_node_id = final_image_saver_node_id_val # Store if needed for get_images

        print(f"DEBUG: [{self.client_id}] Full workflow built. Node count: {len(self.nodes)}")
        return self.nodes, cn_preprocessor_preview_node_id # Return both

    def get_image(self, filename, subfolder, folder_type):
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = parse.urlencode(data)
        with request.urlopen(f"http://{self.server_address}/view?{url_values}") as response:
            return response.read()

    def get_history(self, prompt_id):
        with request.urlopen(f"http://{self.server_address}/history/{prompt_id}") as response:
            return json.loads(response.read())

    def queue_prompt(self) -> str:
        if not self.nodes:
            raise ValueError(f"[{self.client_id}] Workflow nodes are empty, cannot queue prompt.")
        payload = {"prompt": self.nodes, "client_id": self.client_id}
        data = json.dumps(payload).encode('utf-8')
        req = request.Request(f"http://{self.server_address}/prompt", data=data, headers={'Content-Type': 'application/json'})
        try:
            resp = request.urlopen(req)
            response_json = json.loads(resp.read())
            prompt_id = response_json.get('prompt_id')
            if not prompt_id:
                raise ValueError(f"[{self.client_id}] 'prompt_id' not found in ComfyUI response: {response_json}")
            return prompt_id
        except Exception as e:
            error_body_text = ""
            if hasattr(e, 'read'):
                try: error_body_text = e.read().decode()
                except: pass
            print(f"ERROR: [{self.client_id}] Exception during /prompt request: {e}. Body: {error_body_text}")
            raise

    def get_images(self, ws_conn: websocket.WebSocket, current_prompt_id: str, 
                   cn_preprocessor_preview_node_id: Optional[str], # Added this parameter
                   progress_callback=None, total_steps=20):
        current_step_reported = 0
        execution_done = False
        expecting_cn_preprocessor_preview_from_node_id: Optional[str] = None # Initialize
        
        try:
            ws_conn.settimeout(10.0) 
            overall_timeout_seconds = 300 
            start_time = time.time()
            
            while not execution_done:
                if (time.time() - start_time) > overall_timeout_seconds: 
                    print(f"ERROR: [{self.client_id}] Overall timeout ({overall_timeout_seconds}s) reached in get_images loop.")
                    break
                out = None
                try: out = ws_conn.recv()
                except websocket.WebSocketTimeoutException: continue
                except websocket.WebSocketConnectionClosedException: execution_done = True; print(f"INFO: [{self.client_id}] WS closed by remote during get_images."); break
                except socket.timeout: print(f"INFO: [{self.client_id}] Socket timeout during ws.recv(), likely idle."); continue 
                except Exception as e_recv: print(f"ERROR: [{self.client_id}] ws.recv ex: {e_recv}"); execution_done = True; break
                if out is None: continue

                if isinstance(out, str):
                    message = json.loads(out)
                    msg_type, msg_data = message.get('type'), message.get('data', {})
                    
                    if msg_type == 'executing':
                        node_being_executed = msg_data.get('node')
                        if node_being_executed is None and msg_data.get('prompt_id') == current_prompt_id:
                            execution_done = True; break
                        if node_being_executed == cn_preprocessor_preview_node_id:
                            print(f"DEBUG: [{self.client_id}] Executing CN Preprocessor Preview Node (ID: {node_being_executed}). Expecting its binary preview next.")
                            expecting_cn_preprocessor_preview_from_node_id = node_being_executed
                        else:
                            if expecting_cn_preprocessor_preview_from_node_id == node_being_executed:
                                pass 
                            else: 
                                if node_being_executed != cn_preprocessor_preview_node_id:
                                     expecting_cn_preprocessor_preview_from_node_id = None
                    elif msg_type == 'progress' and progress_callback:
                        step_val = msg_data.get('value')
                        max_val = msg_data.get('max')
                        if step_val is not None and max_val is not None:
                             current_step_reported = step_val 
                             progress_callback(step_val, max_val, None, preview_kind="step_progress_text") 
                else: 
                    preview_kind_to_send = "step_preview" 
                    if expecting_cn_preprocessor_preview_from_node_id:
                        print(f"DEBUG: [{self.client_id}] Received binary data, assuming it's from CN Preprocessor Preview Node ID: {expecting_cn_preprocessor_preview_from_node_id}")
                        preview_kind_to_send = "controlnet_preprocessor_output"
                        expecting_cn_preprocessor_preview_from_node_id = None 
                    try:
                        image_type = int.from_bytes(out[4:8], byteorder='little') 
                        image_bytes = out[8:]
                        mime_type = "image/jpeg" if image_type == 1 else "image/png"
                        preview_uri = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
                        if preview_kind_to_send == "step_preview" and len(image_bytes) > 100: 
                            current_step_reported += 1 
                        if progress_callback:
                            progress_callback(min(current_step_reported, total_steps), total_steps, preview_uri, preview_kind=preview_kind_to_send)
                    except Exception as e_preview: print(f"ERROR: [{self.client_id}] Preview processing ex: {e_preview}")
        except Exception as e_outer: print(f"ERROR: [{self.client_id}] Outer get_images ex: {e_outer}")
        finally:
            if ws_conn and ws_conn.connected:
                try: ws_conn.settimeout(None) 
                except: pass

        try:
            history = self.get_history(current_prompt_id).get(current_prompt_id, {})
            images_output = []
            final_saver_node_id_found = None
            
            # Try to find the node ID of "FINAL_IMAGE_SAVER_NODE" from the prompt structure
            # The prompt structure is usually history[prompt_id]['prompt'][2] which is a dict of nodes
            prompt_nodes_dict = history.get('prompt', [None, None, {}])[2] # Safe access
            if isinstance(prompt_nodes_dict, dict):
                for node_id_hist, node_data_hist in prompt_nodes_dict.items():
                    if node_data_hist.get('_meta', {}).get('title') == "FINAL_IMAGE_SAVER_NODE":
                        final_saver_node_id_found = node_id_hist
                        break
            
            if final_saver_node_id_found and final_saver_node_id_found in history.get('outputs', {}):
                node_output = history['outputs'][final_saver_node_id_found]
                if 'images' in node_output:
                    print(f"DEBUG: [{self.client_id}] Found images from FINAL_IMAGE_SAVER_NODE (ID: {final_saver_node_id_found})")
                    for img_info in node_output['images']:
                        images_output.append(self.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
            else:
                print(f"WARN: [{self.client_id}] FINAL_IMAGE_SAVER_NODE not found or no output. Falling back to checking all nodes for images.")
                for node_id_hist_fallback in history.get('outputs', {}):
                    node_output_fallback = history['outputs'][node_id_hist_fallback]
                    # Try to avoid the CN preview if other image outputs exist
                    is_cn_preview_node = False
                    if isinstance(prompt_nodes_dict, dict):
                        if prompt_nodes_dict.get(node_id_hist_fallback, {}).get('_meta', {}).get('title') == "CN Preprocessor Output Preview":
                            is_cn_preview_node = True
                    
                    if is_cn_preview_node and len(history.get('outputs', {})) > 1 and any('images' in v for k, v in history.get('outputs', {}).items() if k != node_id_hist_fallback):
                        print(f"DEBUG: [{self.client_id}] Skipping CN Preview node ({node_id_hist_fallback}) in fallback as other image outputs exist.")
                        continue
                        
                    if 'images' in node_output_fallback:
                        print(f"DEBUG: [{self.client_id}] Found images from fallback node (ID: {node_id_hist_fallback})")
                        for img_info in node_output_fallback['images']:
                            images_output.append(self.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
            return images_output
        except Exception as e_hist:
            print(f"ERROR: [{self.client_id}] History/final image ex: {e_hist}")
            return []

    def pick_image(self, images: List[bytes]) -> Optional[bytes]:
        return images[0] if images else None
    
# Inside ComfyUIAPIGenerator class
    def build_workflow_for_preview(self, params: Dict[str, Any]) -> Dict[str, Any]:
        self.nodes = {}
        self.current_node_id_counter = 0
        print(f"DEBUG: [{self.client_id}] Building PREVIEW workflow for ControlNet.")

        # Parameter defaulting for resolutions (use global if specific not provided)
        res = params.get("cn_global_preprocessor_resolution", 1024)
        actual_cn_anyline_resolution = params.get("cn_anyline_resolution") if params.get("cn_anyline_resolution") is not None else res
        actual_cn_depth_resolution = params.get("cn_depth_resolution") if params.get("cn_depth_resolution") is not None else res
        actual_cn_openpose_resolution = params.get("cn_openpose_resolution") if params.get("cn_openpose_resolution") is not None else res
        actual_cn_canny_resolution = params.get("cn_canny_resolution") if params.get("cn_canny_resolution") is not None else res
        actual_selected_anyline_style = params.get("selected_anyline_style", "lineart_realistic")


        if not params.get("controlnet_ref_image_filename"):
            print(f"ERROR: [{self.client_id}] No reference image filename for preview.")
            return {} # Return empty workflow

        cn_load_image_id, current_image_for_cn_processing = self._add_node(
            "LoadImage", 
            {"image": params["controlnet_ref_image_filename"]}, 
            "CN Load Ref Image (Preview)"
        )
        
        cn_preprocessors_config = params.get("controlnet_preprocessors", {})
        processed_image_available = False

        if cn_preprocessors_config.get("anyLine"):
            # ... (add AnyLineArtPreprocessor_aux node as in main build_workflow, using actual_cn_anyline_resolution and actual_selected_anyline_style)
            anyline_prep_id, lineart_output_ref = self._add_node(
                "AnyLineArtPreprocessor_aux", {
                    "image": current_image_for_cn_processing,
                    "merge_with_lineart": actual_selected_anyline_style,
                    "resolution": actual_cn_anyline_resolution,
                    "lineart_lower_bound": 0.0, "lineart_upper_bound": 1.0,
                    "object_min_size": 36, "object_connectivity": 1
                }, "CN: AnyLineArt (Preview)")
            current_image_for_cn_processing = lineart_output_ref
            processed_image_available = True
        
        if cn_preprocessors_config.get("depth"):
            # ... (add DepthAnythingV2Preprocessor node, using actual_cn_depth_resolution)
            depth_prep_id, depth_output_ref = self._add_node(
                "DepthAnythingV2Preprocessor", {
                    "image": current_image_for_cn_processing, 
                    "ckpt_name": params.get("cn_depth_model", "depth_anything_v2_vitl.pth"), # Get from params or default
                    "resolution": actual_cn_depth_resolution
                }, "CN: Depth (Preview)")
            current_image_for_cn_processing = depth_output_ref
            processed_image_available = True

        if cn_preprocessors_config.get("openPose"):
            # ... (add OpenposePreprocessor node, using actual_cn_openpose_resolution)
            openpose_prep_id, openpose_output_ref = self._add_node(
                "OpenposePreprocessor", {
                    "image": current_image_for_cn_processing, 
                    "resolution": actual_cn_openpose_resolution,
                    "detect_hand":"enable", "detect_body":"enable", "detect_face":"enable", 
                    "scale_stick_for_xinsr_cn":"disable"
                }, "CN: OpenPose (Preview)")
            current_image_for_cn_processing = openpose_output_ref
            processed_image_available = True

        if cn_preprocessors_config.get("canny"):
            # ... (add CannyEdgePreprocessor node, using actual_cn_canny_resolution)
            canny_prep_id, canny_output_ref = self._add_node(
                "CannyEdgePreprocessor", {
                    "image": current_image_for_cn_processing, 
                    "low_threshold": 100, "high_threshold": 200, 
                    "resolution": actual_cn_canny_resolution
                }, "CN: Canny (Preview)")
            current_image_for_cn_processing = canny_output_ref
            processed_image_available = True
        
        final_image_to_preview = current_image_for_cn_processing # This is the output of the chain

        if final_image_to_preview:
            self._add_node( # This PreviewImage will be the only image output of this workflow
                "PreviewImage",
                {"images": final_image_to_preview},
                "FINAL PREPROCESSOR PREVIEW" # Make title distinct
            )
        else: # Should not happen if ref image is loaded
            print(f"WARN: [{self.client_id}] No image to preview after preprocessor chain.")
            return {}


        print(f"DEBUG: [{self.client_id}] PREVIEW workflow built. Node count: {len(self.nodes)}")
        return self.nodes

def run_comfyui_dynamic(progress_callback=None, **kwargs) -> Optional[bytes]:
    server_address = kwargs.get("server_address", "192.168.50.106:8188")
    job_client_id = str(uuid.uuid4())
    print(f"INFO: [run_comfyui_dynamic] Job {job_client_id} starting. Params keys: {list(kwargs.keys())}")

    comfy_ws = None
    generated_image_bytes = None
    temp_files_to_clean = []
    cn_preprocessor_preview_node_id_from_build: Optional[str] = None 

    try:
        if kwargs.get("clipvision_enabled") and kwargs.get("clipvision_ref_image_base64"):
            cv_file = save_base64_image_to_input(kwargs["clipvision_ref_image_base64"], "cv_ref_")
            if cv_file: 
                kwargs["clipvision_ref_image_filename"] = cv_file
                temp_files_to_clean.append(os.path.join(COMFYUI_INPUT_PATH, cv_file))
            else: 
                kwargs["clipvision_enabled"] = False
                print(f"WARN: [{job_client_id}] Failed to save CV ref image, disabling CV.")

        if kwargs.get("controlnet_enabled") and kwargs.get("controlnet_ref_image_base64"):
            cn_file = save_base64_image_to_input(kwargs["controlnet_ref_image_base64"], "cn_ref_")
            if cn_file: 
                kwargs["controlnet_ref_image_filename"] = cn_file
                temp_files_to_clean.append(os.path.join(COMFYUI_INPUT_PATH, cn_file))
            else: 
                kwargs["controlnet_enabled"] = False
                print(f"WARN: [{job_client_id}] Failed to save CN ref image, disabling CN.")
        
        ws_url = f"ws://{server_address}/ws?clientId={job_client_id}"
        comfy_ws = websocket.create_connection(ws_url, timeout=30) 
        print(f"DEBUG: [{job_client_id}] Connected to ComfyUI WS: {comfy_ws.connected}")

        generator = ComfyUIAPIGenerator(server_address, job_client_id)
        
        # build_workflow sets self.nodes internally and returns the preview node ID
        # The first returned value (nodes dict) is not strictly needed here as queue_prompt uses self.nodes
        _, cn_preprocessor_preview_node_id_from_build = generator.build_workflow(kwargs)
        
        prompt_id = generator.queue_prompt()
        
        total_steps_calc = kwargs.get("steps", 20)
        if kwargs.get("hf_enable"):
            hf_steps_param = kwargs.get("hf_steps")
            total_steps_calc += hf_steps_param if hf_steps_param is not None else 15
        
        final_images = generator.get_images(
            comfy_ws, 
            prompt_id, 
            cn_preprocessor_preview_node_id_from_build, # Pass the captured ID
            progress_callback, 
            total_steps_calc
        )
        generated_image_bytes = generator.pick_image(final_images)

    except ConnectionRefusedError: 
        print(f"ERROR: [{job_client_id}] Connection refused by ComfyUI WS at {ws_url}")
    except websocket.WebSocketTimeoutException: 
        print(f"ERROR: [{job_client_id}] Timeout connecting/communicating with ComfyUI WS at {ws_url}")
    except socket.timeout: 
        print(f"ERROR: [{job_client_id}] General socket timeout during ComfyUI operation with {ws_url}")
    except Exception as e:
        print(f"ERROR: [run_comfyui_dynamic] Unhandled exception for job {job_client_id}: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
    finally:
        if comfy_ws and comfy_ws.connected: 
            try: 
                comfy_ws.close()
            except Exception as e_close: 
                print(f"ERROR: [{job_client_id}] Closing WS: {e_close}")
        for f_path in temp_files_to_clean:
            try:
                if os.path.exists(f_path): 
                    os.remove(f_path)
                    print(f"DEBUG: [{job_client_id}] Cleaned temp file: {f_path}")
            except Exception as e_clean: 
                print(f"ERROR: [{job_client_id}] Cleaning temp file {f_path}: {e_clean}")
        print(f"INFO: [run_comfyui_dynamic] Job {job_client_id} finished.")
    return generated_image_bytes


# comfyui.py (outside the class)

def run_controlnet_preview_only(**kwargs) -> Optional[bytes]:
    server_address = kwargs.get("server_address", "192.168.50.106:8188")
    job_client_id = str(uuid.uuid4())
    print(f"INFO: [run_controlnet_preview_only] Job {job_client_id} starting.")

    comfy_ws = None
    preview_image_bytes = None
    temp_files_to_clean = []

    try:
        if kwargs.get("controlnet_ref_image_base64"):
            cn_file = save_base64_image_to_input(kwargs["controlnet_ref_image_base64"], "cn_prev_ref_")
            if cn_file:
                kwargs["controlnet_ref_image_filename"] = cn_file
                temp_files_to_clean.append(os.path.join(COMFYUI_INPUT_PATH, cn_file))
            else:
                print(f"ERROR: [{job_client_id}] Failed to save CN ref image for preview.")
                return None # Cannot proceed without ref image
        else:
            print(f"ERROR: [{job_client_id}] No CN ref image base64 provided for preview.")
            return None

        ws_url = f"ws://{server_address}/ws?clientId={job_client_id}"
        comfy_ws = websocket.create_connection(ws_url, timeout=30)
        print(f"DEBUG: [{job_client_id}] Connected to ComfyUI WS for PREVIEW.")

        generator = ComfyUIAPIGenerator(server_address, job_client_id)
        # Call the new workflow builder for preview
        preview_workflow_nodes = generator.build_workflow_for_preview(kwargs)
        
        if not preview_workflow_nodes: # Check if workflow build failed
            print(f"ERROR: [{job_client_id}] Failed to build preview workflow.")
            return None

        # Queue the minimal preview workflow
        # queue_prompt needs to be adjusted or a simpler version used if it expects self.nodes
        # For now, let's assume queue_prompt can take nodes directly or we make a variant
        
        # Simplified queueing for preview (no complex get_images needed)
        payload = {"prompt": preview_workflow_nodes, "client_id": job_client_id}
        data = json.dumps(payload).encode('utf-8')
        req = request.Request(f"http://{generator.server_address}/prompt", data=data, headers={'Content-Type': 'application/json'})
        resp = request.urlopen(req)
        response_json = json.loads(resp.read())
        prompt_id = response_json.get('prompt_id')

        if not prompt_id:
            raise ValueError(f"[{job_client_id}] 'prompt_id' not found for preview.")

        # Wait for execution and get history
        # A simpler wait loop might be needed here as we only expect one image from history
        while True:
            history_data = generator.get_history(prompt_id)
            if prompt_id in history_data and history_data[prompt_id].get('status', {}).get('completed', False):
                break
            time.sleep(0.2) # Poll history

        history = history_data[prompt_id]
        images_output = []
        for node_id_hist in history.get('outputs', {}):
            node_output = history['outputs'][node_id_hist]
            # We expect only one PreviewImage node to output an image
            if node_output.get('images'):
                for img_info in node_output['images']:
                    images_output.append(generator.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
        
        preview_image_bytes = images_output[0] if images_output else None

    except Exception as e:
        print(f"ERROR: [run_controlnet_preview_only] Exception for job {job_client_id}: {type(e).__name__} - {e}")
        import traceback; traceback.print_exc()
        # Return None on error
        return None
    finally:
        if comfy_ws and comfy_ws.connected:
            try: comfy_ws.close()
            except: pass # Ignore close errors
        for f_path in temp_files_to_clean:
            try:
                if os.path.exists(f_path): os.remove(f_path)
            except Exception as e_clean: print(f"ERROR: [{job_client_id}] Cleaning temp file {f_path}: {e_clean}")
        print(f"INFO: [run_controlnet_preview_only] Job {job_client_id} finished.")
    return preview_image_bytes