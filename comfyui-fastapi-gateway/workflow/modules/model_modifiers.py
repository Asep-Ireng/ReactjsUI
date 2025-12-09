"""
Model modifier modules - LoRA, ModelMerge, SamplingDiscrete.
"""
import os
from typing import Dict, Any
from .base import BaseModule
from ..context import WorkflowContext


class LoraModule(BaseModule):
    """Applies LoRA models to the base model."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return (
            params.get("loras_enabled") and 
            params.get("loras_config") and 
            len(params.get("loras_config", [])) > 0
        )
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Chain LoRA loaders onto the model."""
        
        for lora_info in params["loras_config"]:
            lora_name = lora_info.get("name")
            lora_strength = float(lora_info.get("strength", 1.0))
            
            if not lora_name or lora_name == "none":
                continue
            
            # Normalize path separators for ComfyUI
            lora_name_normalized = lora_name.replace("/", "\\")
            
            lora_id, _ = ctx.add_node(
                "LoraLoader",
                {
                    "lora_name": lora_name_normalized,
                    "strength_model": lora_strength,
                    "strength_clip": lora_strength,
                    "model": ctx.model_ref,
                    "clip": ctx.clip_ref,
                },
                f"Load LoRA: {os.path.basename(lora_name)}"
            )
            
            # Update model and clip references
            ctx.model_ref = ctx.get_ref(lora_id, 0)
            ctx.clip_ref = ctx.get_ref(lora_id, 1)
            
            print(f"[LoraModule] Added LoRA: {lora_name} @ {lora_strength}")


class ModelMergeModule(BaseModule):
    """Merges two models with a ratio using ModelMergeSimple."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return (
            params.get("model_merge_enabled") and 
            params.get("model2_name")
        )
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Add ModelMergeSimple node to merge two models."""
        
        model2_name = params["model2_name"]
        merge_ratio = params.get("model_merge_ratio", 0.5)
        
        # Load second checkpoint
        ckpt2_id, _ = ctx.add_node(
            "CheckpointLoaderSimple",
            {"ckpt_name": model2_name},
            "Load Checkpoint 2 (Merge)"
        )
        model2_ref = ctx.get_ref(ckpt2_id, 0)
        
        # Merge models
        merge_id, _ = ctx.add_node(
            "ModelMergeSimple",
            {
                "model1": ctx.model_ref,
                "model2": model2_ref,
                "ratio": merge_ratio,
            },
            f"Merge Models (ratio: {merge_ratio})"
        )
        
        # Update model reference
        ctx.model_ref = ctx.get_ref(merge_id, 0)
        
        print(f"[ModelMergeModule] Merged with {model2_name} @ ratio {merge_ratio}")


class SamplingDiscreteModule(BaseModule):
    """Applies ModelSamplingDiscrete for sampling type control."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return params.get("sampling_discrete_enabled", False)
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Add ModelSamplingDiscrete node."""
        
        sampling_type = params.get("sampling_type", "eps")
        zsnr_enabled = params.get("zsnr_enabled", False)
        
        sampling_id, _ = ctx.add_node(
            "ModelSamplingDiscrete",
            {
                "model": ctx.model_ref,
                "sampling": sampling_type,
                "zsnr": zsnr_enabled,
            },
            f"Sampling Discrete ({sampling_type})"
        )
        
        # Update model reference
        ctx.model_ref = ctx.get_ref(sampling_id, 0)
        
        print(f"[SamplingDiscreteModule] Applied {sampling_type}, ZSNR: {zsnr_enabled}")
