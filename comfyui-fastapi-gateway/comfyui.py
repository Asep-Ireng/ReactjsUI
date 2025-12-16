import websocket
import uuid
import json
import urllib.request as request
import urllib.parse as parse
import os
import time
from typing import Dict, Any, Optional, List, Tuple
import base64
import socket
from workflow import WorkflowBuilder # Import the new builder

# --- Configuration & Helper Functions ---
COMFYUI_SERVER_ADDRESS = "127.0.0.1:8188" # Default, can be overridden

def upload_image_to_comfyui(base64_string: str, prefix: str = "img_", server_address: str = COMFYUI_SERVER_ADDRESS) -> Optional[str]:
    """Decodes a base64 string and uploads it to ComfyUI via API."""
    if not base64_string: return None
    try:
        if "," in base64_string:
            header, encoded = base64_string.split(",", 1)
        else:
            encoded = base64_string

        image_data = base64.b64decode(encoded)
        filename = f"{prefix}{uuid.uuid4()}.png"
        
        # Prepare multipart form data manually (since we stick to stdlib if possible, or use requests)
        # Using requests is easier and already imported in server.py, but comfyui.py uses urllib/socket mostly.
        # But wait, we can just use requests library. It's standard in this environment?
        # Actually server.py imports fastAPI, not requests. Let's look at comfyui.py imports.
        # It imports urllib.request.
        
        # Let's use requests if available, or multipart encoding with urllib.
        # Easier to use 'requests' library which is commonly available in python environments for AI/web.
        # If requests is not imported, let's import it.
        import requests
        
        url = f"http://{server_address}/upload/image"
        files = {'image': (filename, image_data, 'image/png')}
        data = {'overwrite': 'true', 'type': 'input'}
        
        print(f"DEBUG: Uploading image {filename} to {url}")
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            resp_data = response.json()
            # ComfyUI returns {"name": "filename.png", "subfolder": "", "type": "input"}
            # We might handle subfolder if it exists, but for now assuming root input
            return resp_data.get("name")
        else:
            print(f"ERROR: Failed to upload image. Status: {response.status_code}, Resp: {response.text}")
            return None

    except Exception as e:
        print(f"ERROR: Failed to upload base64 image: {e}")
        return None

# --- ComfyUI API Generator Class ---
class ComfyUIAPIGenerator:
    def __init__(self, server_address: str = "127.0.0.1:8188", client_id="debug_client_id"):
        self.server_address = server_address
        self.client_id = client_id
        self.nodes: Dict[str, Any] = {}
        # Initialize the new WorkflowBuilder
        self.builder = WorkflowBuilder(client_id) 
        print(f"DEBUG: ComfyUIAPIGenerator initialized for client_id: {self.client_id} (Modular Workflow)")

    def build_workflow(self, params: Dict[str, Any]) -> tuple[Dict[str, Any], Optional[str]]:
        """
        Builds the full generation workflow using WorkflowBuilder.
        Returns (nodes_dict, cn_preview_node_id)
        """
        try:
            nodes, preview_id = self.builder.build(params)
            self.nodes = nodes # Store for queue_prompt
            return nodes, preview_id
        except Exception as e:
            print(f"ERROR: [{self.client_id}] Failed to build workflow: {e}")
            import traceback; traceback.print_exc()
            return {}, None

    def build_workflow_for_preview(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Builds a preview-only workflow using WorkflowBuilder.
        Returns nodes_dict.
        """
        try:
            nodes = self.builder.build_preview_workflow(params)
            self.nodes = nodes
            return nodes
        except Exception as e:
            print(f"ERROR: [{self.client_id}] Failed to build preview workflow: {e}")
            import traceback; traceback.print_exc()
            return {}

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
                   cn_preprocessor_preview_node_id: Optional[str],
                   progress_callback=None, total_steps=20):
        current_step_reported = 0
        execution_done = False
        expecting_cn_preprocessor_preview_from_node_id: Optional[str] = None
        
        try:
            ws_conn.settimeout(10.0) 
            overall_timeout_seconds = 300 
            start_time = time.time()
            
            while not execution_done:
                if (time.time() - start_time) > overall_timeout_seconds: 
                    print(f"ERROR: [{self.client_id}] Overall timeout reached in get_images.")
                    break
                out = None
                try: out = ws_conn.recv()
                except websocket.WebSocketTimeoutException: continue
                except websocket.WebSocketConnectionClosedException: execution_done = True; break
                except socket.timeout: continue 
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
                            expecting_cn_preprocessor_preview_from_node_id = node_being_executed
                        else:
                            if expecting_cn_preprocessor_preview_from_node_id != node_being_executed:
                                 if node_being_executed != cn_preprocessor_preview_node_id:
                                     expecting_cn_preprocessor_preview_from_node_id = None
                    elif msg_type == 'progress' and progress_callback:
                        step_val = msg_data.get('value')
                        max_val = msg_data.get('max')
                        if step_val is not None:
                             current_step_reported = step_val 
                             progress_callback(step_val, max_val, None, preview_kind="step_progress_text") 
                else: 
                    preview_kind_to_send = "step_preview" 
                    if expecting_cn_preprocessor_preview_from_node_id:
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
                    except Exception: pass
        except Exception as e_outer: print(f"ERROR: [{self.client_id}] Outer get_images ex: {e_outer}")
        finally:
            if ws_conn and ws_conn.connected:
                try: ws_conn.settimeout(None) 
                except: pass

        try:
            history = self.get_history(current_prompt_id).get(current_prompt_id, {})
            images_output = []
            final_saver_node_id_found = None
            
            prompt_nodes_dict = history.get('prompt', [None, None, {}])[2]
            if isinstance(prompt_nodes_dict, dict):
                for node_id_hist, node_data_hist in prompt_nodes_dict.items():
                    if node_data_hist.get('_meta', {}).get('title') == "FINAL_IMAGE_SAVER_NODE":
                        final_saver_node_id_found = node_id_hist
                        break
            
            if final_saver_node_id_found and final_saver_node_id_found in history.get('outputs', {}):
                node_output = history['outputs'][final_saver_node_id_found]
                if 'images' in node_output:
                    for img_info in node_output['images']:
                        images_output.append(self.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
            else:
                for node_id_hist_fallback in history.get('outputs', {}):
                    node_output_fallback = history['outputs'][node_id_hist_fallback]
                    is_cn_preview_node = False
                    if isinstance(prompt_nodes_dict, dict):
                        if prompt_nodes_dict.get(node_id_hist_fallback, {}).get('_meta', {}).get('title') == "FINAL PREPROCESSOR PREVIEW":
                            is_cn_preview_node = True
                    
                    if is_cn_preview_node and len(history.get('outputs', {})) > 1:
                        continue
                        
                    if 'images' in node_output_fallback:
                        for img_info in node_output_fallback['images']:
                            images_output.append(self.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
            return images_output
        except Exception as e_hist:
            print(f"ERROR: [{self.client_id}] History/final image ex: {e_hist}")
            return []

    def pick_image(self, images: List[bytes]) -> Optional[bytes]:
        return images[0] if images else None

# --- Main Entry Points ---

def run_comfyui_dynamic(progress_callback=None, **kwargs) -> Optional[bytes]:
    server_address = kwargs.get("server_address", "127.0.0.1:8188")
    job_client_id = str(uuid.uuid4())
    print(f"INFO: [run_comfyui_dynamic] Job {job_client_id} starting.")

    comfy_ws = None
    generated_image_bytes = None
    temp_files_to_clean = []
    
    try:
        # Save reference images if present (Uploaded to ComfyUI)
        if kwargs.get("clipvision_enabled") and kwargs.get("clipvision_ref_image_base64"):
            cv_file = upload_image_to_comfyui(kwargs["clipvision_ref_image_base64"], "cv_ref_", server_address)
            if cv_file: 
                kwargs["clipvision_ref_image_filename"] = cv_file

        if kwargs.get("controlnet_enabled") and kwargs.get("controlnet_ref_image_base64"):
            cn_file = upload_image_to_comfyui(kwargs["controlnet_ref_image_base64"], "cn_ref_", server_address)
            if cn_file: 
                kwargs["controlnet_ref_image_filename"] = cn_file
        
        ws_url = f"ws://{server_address}/ws?clientId={job_client_id}"
        comfy_ws = websocket.create_connection(ws_url, timeout=30) 

        generator = ComfyUIAPIGenerator(server_address, job_client_id)
        
        # Build workflow
        _, cn_preprocessor_preview_node_id = generator.build_workflow(kwargs)
        
        prompt_id = generator.queue_prompt()
        
        total_steps_calc = kwargs.get("steps", 20)
        if kwargs.get("hf_enable"):
            hf_steps_param = kwargs.get("hf_steps")
            total_steps_calc += hf_steps_param if hf_steps_param is not None else 15
        
        final_images = generator.get_images(
            comfy_ws, 
            prompt_id, 
            cn_preprocessor_preview_node_id,
            progress_callback, 
            total_steps_calc
        )
        generated_image_bytes = generator.pick_image(final_images)

    except Exception as e:
        print(f"ERROR: [run_comfyui_dynamic] Exception for job {job_client_id}: {e}")
        import traceback; traceback.print_exc()
    finally:
        if comfy_ws and comfy_ws.connected: 
            try: comfy_ws.close()
            except: pass
        for f_path in temp_files_to_clean:
            try:
                if os.path.exists(f_path): os.remove(f_path)
            except: pass
        print(f"INFO: [run_comfyui_dynamic] Job {job_client_id} finished.")
    return generated_image_bytes


def run_controlnet_preview_only(**kwargs) -> Optional[bytes]:
    server_address = kwargs.get("server_address", "127.0.0.1:8188")
    job_client_id = str(uuid.uuid4())
    print(f"INFO: [run_controlnet_preview_only] Job {job_client_id} starting.")

    comfy_ws = None
    preview_image_bytes = None
    temp_files_to_clean = []

    try:
        if kwargs.get("controlnet_ref_image_base64"):
            cn_file = upload_image_to_comfyui(kwargs["controlnet_ref_image_base64"], "cn_prev_ref_", server_address)
            if cn_file:
                kwargs["controlnet_ref_image_filename"] = cn_file
            else:
                return None
        else:
            return None

        ws_url = f"ws://{server_address}/ws?clientId={job_client_id}"
        comfy_ws = websocket.create_connection(ws_url, timeout=30)

        generator = ComfyUIAPIGenerator(server_address, job_client_id)
        
        # Build workflow
        preview_nodes = generator.build_workflow_for_preview(kwargs)
        if not preview_nodes: return None

        # Manually queue (simple preview)
        payload = {"prompt": preview_nodes, "client_id": job_client_id}
        data = json.dumps(payload).encode('utf-8')
        req = request.Request(f"http://{server_address}/prompt", data=data, headers={'Content-Type': 'application/json'})
        resp = request.urlopen(req)
        prompt_id = json.loads(resp.read()).get('prompt_id')

        # Wait for images (simplified)
        while True:
            history_data = generator.get_history(prompt_id)
            if prompt_id in history_data and history_data[prompt_id].get('status', {}).get('completed', False):
                break
            time.sleep(0.2)

        history = history_data[prompt_id]
        images_output = []
        for node_id_hist in history.get('outputs', {}):
            node_output = history['outputs'][node_id_hist]
            if 'images' in node_output:
                for img_info in node_output['images']:
                    images_output.append(generator.get_image(img_info['filename'], img_info['subfolder'], img_info['type']))
        
        preview_image_bytes = images_output[0] if images_output else None

    except Exception as e:
        print(f"ERROR: [run_controlnet_preview_only] Exception: {e}")
        import traceback; traceback.print_exc()
    finally:
        if comfy_ws and comfy_ws.connected:
            try: comfy_ws.close()
            except: pass
        for f_path in temp_files_to_clean:
            try:
                if os.path.exists(f_path): os.remove(f_path)
            except: pass
    return preview_image_bytes