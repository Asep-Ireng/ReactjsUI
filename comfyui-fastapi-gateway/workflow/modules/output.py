"""
Output module - Image saving.
"""
from typing import Dict, Any
from .base import BaseModule
from ..context import WorkflowContext


class OutputModule(BaseModule):
    """Final image saving node."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        # Always run - we need to save the image
        return True
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Build the Image Saver node."""
        
        filename_format = params.get("output_filename_format", "%time_%seed")
        path_format = params.get("output_path_format", "%date")
        
        seed = params.get("random_seed", -1)
        width = params.get("width", 512)
        height = params.get("height", 512)
        clipskip = params.get("clipskip", -2)
        sampler_name = params.get("sampler_name", "euler_ancestral")
        scheduler = params.get("scheduler", "normal")
        positive_prompt = params.get("positive_prompt", "")
        negative_prompt = params.get("negative_prompt", "")
        
        saver_id, _ = ctx.add_node(
            "Image Saver",
            {
                "images": ctx.pixels_ref,
                "filename": filename_format,
                "path": path_format,
                "extension": "png",
                "steps": ctx.steps_cfg_ref,
                "cfg": ctx.get_ref(ctx.steps_cfg_ref[0], 1),
                "modelname": ctx.model_name_str_ref,
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "positive": positive_prompt,
                "negative": negative_prompt,
                "seed_value": seed,
                "width": width,
                "height": height,
                "lossless_webp": True,
                "quality_jpeg_or_webp": 100,
                "optimize_png": False,
                "counter": 0,
                "denoise": 1.0,
                "clip_skip": clipskip,
                "time_format": "%Y-%m-%d-%H%M%S",
                "save_workflow_as_json": False,
                "embed_workflow": True,
                "additional_hashes": "",
                "download_civitai_data": True,
                "easy_remix": True,
            },
            "FINAL_IMAGE_SAVER_NODE"
        )
        ctx.final_saver_node_id = saver_id
        
        print(f"[OutputModule] Image Saver configured: {path_format}/{filename_format}")
