"""
Sampler module - EmptyLatent and KSampler.
"""
from typing import Dict, Any
from .base import BaseModule
from ..context import WorkflowContext


class SamplerModule(BaseModule):
    """Creates empty latent and runs KSampler."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        # Always run - we need sampling
        return True
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Build EmptyLatent, StepsAndCfg, and KSampler nodes."""
        
        width = params.get("width", 512)
        height = params.get("height", 512)
        batch_size = params.get("batch_size", 1)
        landscape = params.get("api_image_landscape", False)
        hf_scale = params.get("hf_scale", 1.5)
        
        seed = params.get("random_seed", -1)
        steps = params.get("steps", 20)
        cfg = params.get("cfg", 7.0)
        sampler_name = params.get("sampler_name", "euler_ancestral")
        scheduler = params.get("scheduler", "normal")
        denoise = params.get("denoise", 1.0)
        
        # Canvas Creator (handles landscape flip and hires multiplier)
        canvas_id, _ = ctx.add_node(
            "CanvasCreatorAdvanced",
            {
                "Width": width,
                "Height": height,
                "Batch": batch_size,
                "Landscape": landscape,
                "HiResMultiplier": hf_scale,
            },
            "Create Canvas"
        )
        
        # Only create empty latent if not using ClipVision img2img
        if ctx.latent_ref is None:
            empty_latent_id, _ = ctx.add_node(
                "EmptyLatentImage",
                {
                    "width": ctx.get_ref(canvas_id, 0),
                    "height": ctx.get_ref(canvas_id, 1),
                    "batch_size": ctx.get_ref(canvas_id, 2),
                },
                "Empty Latent"
            )
            ctx.latent_ref = ctx.get_ref(empty_latent_id, 0)
        
        # Steps and CFG node (for Image Saver compatibility)
        steps_cfg_id, _ = ctx.add_node(
            "StepsAndCfg",
            {
                "steps": steps,
                "cfg": cfg,
            },
            "Steps & CFG"
        )
        ctx.steps_cfg_ref = [steps_cfg_id, 0]
        
        # Main KSampler
        ksampler_id, _ = ctx.add_node(
            "KSampler",
            {
                "model": ctx.model_ref,
                "positive": ctx.positive_cond_ref,
                "negative": ctx.negative_cond_ref,
                "latent_image": ctx.latent_ref,
                "seed": seed,
                "steps": ctx.get_ref(steps_cfg_id, 0),
                "cfg": ctx.get_ref(steps_cfg_id, 1),
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "denoise": denoise,
            },
            "KSampler (Main)"
        )
        
        # Decode to pixels
        decode_id, _ = ctx.add_node(
            "VAEDecode",
            {
                "samples": ctx.get_ref(ksampler_id, 0),
                "vae": ctx.vae_ref,
            },
            "VAE Decode"
        )
        ctx.pixels_ref = ctx.get_ref(decode_id, 0)
        
        print(f"[SamplerModule] KSampler: {sampler_name}/{scheduler}, steps={steps}")
