"""
Postprocess module - HiresFix upscaling and color transfer.
"""
from typing import Dict, Any
from .base import BaseModule
from ..context import WorkflowContext


class HiresFixModule(BaseModule):
    """Applies HiresFix upscaling with optional color transfer."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return params.get("hf_enable", False)
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Build HiresFix upscaling chain."""
        
        hf_scale = params.get("hf_scale", 1.5)
        hf_upscaler = params.get("hf_upscaler", "RealESRGAN_x4.pth")
        hf_denoise = params.get("hf_denoising_strength", 0.4)
        hf_steps = params.get("hf_steps", 15)
        hf_cfg = params.get("hf_cfg", 7.0)
        hf_sampler = params.get("hf_sampler") or params.get("sampler_name", "euler")
        hf_scheduler = params.get("hf_scheduler") or params.get("scheduler", "normal")
        hf_colortransfer = params.get("hf_colortransfer", "none")
        seed = params.get("random_seed", -1)
        
        # Ensure upscaler name has extension
        if not hf_upscaler.lower().endswith(('.pth', '.safetensors')):
            hf_upscaler += ".pth"
        
        # Store original pixels for color transfer
        original_pixels_ref = ctx.pixels_ref
        
        # Load upscaler model
        upscaler_id, _ = ctx.add_node(
            "UpscaleModelLoader",
            {"model_name": hf_upscaler},
            "HF: Load Upscaler"
        )
        
        # Upscale image
        upscale_id, _ = ctx.add_node(
            "UpscaleImageByModelThenResize",
            {
                "upscale_model": ctx.get_ref(upscaler_id, 0),
                "image": ctx.pixels_ref,
                "resize_scale": hf_scale,
                "resize_method": "nearest",
            },
            "HF: Upscale"
        )
        upscaled_ref = ctx.get_ref(upscale_id, 0)
        
        # VAE Encode Tiled
        vae_encode_id, _ = ctx.add_node(
            "VAEEncodeTiled",
            {
                "pixels": upscaled_ref,
                "vae": ctx.vae_ref,
                "tile_size": 512,
                "overlap": 64,
                "temporal_size": 64,
                "temporal_overlap": 8,
            },
            "HF: VAE Encode Tiled"
        )
        
        # HiresFix KSampler (uses base model, not LoRA'd)
        hf_ksampler_id, _ = ctx.add_node(
            "KSampler",
            {
                "model": ctx.model_ref,  # Use current model (with LoRAs applied)
                "positive": ctx.positive_cond_ref,
                "negative": ctx.negative_cond_ref,
                "latent_image": ctx.get_ref(vae_encode_id, 0),
                "seed": seed,
                "steps": hf_steps,
                "cfg": hf_cfg,
                "sampler_name": hf_sampler,
                "scheduler": hf_scheduler,
                "denoise": hf_denoise,
            },
            "HF: KSampler"
        )
        
        # VAE Decode Tiled
        vae_decode_id, _ = ctx.add_node(
            "VAEDecodeTiled",
            {
                "samples": ctx.get_ref(hf_ksampler_id, 0),
                "vae": ctx.vae_ref,
                "tile_size": 512,
                "overlap": 64,
                "temporal_size": 64,
                "temporal_overlap": 8,
            },
            "HF: VAE Decode Tiled"
        )
        ctx.pixels_ref = ctx.get_ref(vae_decode_id, 0)
        
        # Apply color transfer if enabled
        if hf_colortransfer and hf_colortransfer != "none":
            ct_id, _ = ctx.add_node(
                "ImageColorTransferMira",
                {
                    "src_image": ctx.pixels_ref,
                    "ref_image": original_pixels_ref,
                    "method": hf_colortransfer,
                },
                f"HF: Color Transfer ({hf_colortransfer})"
            )
            ctx.pixels_ref = ctx.get_ref(ct_id, 0)
        
        print(f"[HiresFixModule] Applied upscale {hf_scale}x with {hf_upscaler}")
