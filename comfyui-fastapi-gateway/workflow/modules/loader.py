"""
Loader module - Checkpoint and VAE loading.
"""
import os
from typing import Dict, Any
from .base import BaseModule
from ..context import WorkflowContext


class LoaderModule(BaseModule):
    """Loads the checkpoint model."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        # Always run - we need a model
        return True
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Load the checkpoint and set up base model/clip/vae references."""
        
        model_name = params.get("model_name", "default")
        
        # Checkpoint Loader with Name (Image Saver compatible)
        ckpt_id, _ = ctx.add_node(
            "Checkpoint Loader with Name (Image Saver)",
            {"ckpt_name": model_name},
            "Load Checkpoint"
        )
        
        # Set context references
        ctx.model_ref = ctx.get_ref(ckpt_id, 0)      # MODEL output
        ctx.clip_ref = ctx.get_ref(ckpt_id, 1)       # CLIP output
        ctx.vae_ref = ctx.get_ref(ckpt_id, 2)        # VAE output
        ctx.model_name_str_ref = ctx.get_ref(ckpt_id, 3)  # Model name string
        
        print(f"[LoaderModule] Loaded checkpoint: {model_name}")
