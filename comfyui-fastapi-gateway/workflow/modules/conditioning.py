"""
Conditioning modules - CLIP encoding, ControlNet, ClipVision.
"""
from typing import Dict, Any, Optional
from .base import BaseModule
from ..context import WorkflowContext


class ConditioningModule(BaseModule):
    """CLIP text encoding for positive/negative prompts."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        # Always run - we need conditioning
        return True
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Build CLIP text encoding nodes with CLIP skip."""
        
        clipskip = params.get("clipskip", -2)
        positive_prompt = params.get("positive_prompt", "")
        negative_prompt = params.get("negative_prompt", "")
        
        # CLIP Skip
        clip_skip_id, _ = ctx.add_node(
            "CLIPSetLastLayer",
            {
                "clip": ctx.clip_ref,
                "stop_at_clip_layer": clipskip,
            },
            f"CLIP Skip ({clipskip})"
        )
        clip_with_skip = ctx.get_ref(clip_skip_id, 0)
        
        # Positive prompt encoding
        pos_encode_id, _ = ctx.add_node(
            "CLIPTextEncode",
            {
                "text": positive_prompt,
                "clip": clip_with_skip,
            },
            "Positive Prompt"
        )
        ctx.positive_cond_ref = ctx.get_ref(pos_encode_id, 0)
        
        # Negative prompt encoding
        neg_encode_id, _ = ctx.add_node(
            "CLIPTextEncode",
            {
                "text": negative_prompt,
                "clip": ctx.clip_ref,  # Use base clip for negative
            },
            "Negative Prompt"
        )
        ctx.negative_cond_ref = ctx.get_ref(neg_encode_id, 0)
        
        print(f"[ConditioningModule] Encoded prompts with clipskip={clipskip}")


class ClipVisionModule(BaseModule):
    """CLIP Vision / unCLIP conditioning."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return (
            params.get("clipvision_enabled") and 
            params.get("clipvision_ref_image_filename") and
            params.get("clipvision_model_name")
        )
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Add ClipVision encoding and unCLIP conditioning."""
        
        ref_image = params["clipvision_ref_image_filename"]
        cv_model = params["clipvision_model_name"]
        cv_strength = params.get("clipvision_strength", 1.0)
        
        # Load reference image
        load_img_id, _ = ctx.add_node(
            "LoadImage",
            {"image": ref_image},
            "CV Load Ref Image"
        )
        image_ref = ctx.get_ref(load_img_id, 0)
        
        # Load CLIP Vision model
        cv_loader_id, _ = ctx.add_node(
            "CLIPVisionLoader",
            {"clip_name": cv_model},
            "Load CLIP Vision"
        )
        cv_model_ref = ctx.get_ref(cv_loader_id, 0)
        
        # Encode with CLIP Vision
        cv_encode_id, _ = ctx.add_node(
            "CLIPVisionEncode",
            {
                "clip_vision": cv_model_ref,
                "image": image_ref,
                "crop": "center",
            },
            "CLIP Vision Encode"
        )
        cv_output_ref = ctx.get_ref(cv_encode_id, 0)
        
        # Apply unCLIP conditioning
        unclip_id, _ = ctx.add_node(
            "unCLIPConditioning",
            {
                "conditioning": ctx.positive_cond_ref,
                "clip_vision_output": cv_output_ref,
                "strength": cv_strength,
                "noise_augmentation": 0.0,
            },
            "unCLIP Conditioning"
        )
        ctx.positive_cond_ref = ctx.get_ref(unclip_id, 0)
        
        # Also encode the image as latent for potential img2img
        vae_encode_id, _ = ctx.add_node(
            "VAEEncode",
            {
                "pixels": image_ref,
                "vae": ctx.vae_ref,
            },
            "VAE Encode (CV Ref)"
        )
        ctx.latent_ref = ctx.get_ref(vae_encode_id, 0)
        
        print(f"[ClipVisionModule] Added CLIP Vision with strength={cv_strength}")


class ControlNetModule(BaseModule):
    """ControlNet preprocessing and application."""
    
    def should_run(self, params: Dict[str, Any]) -> bool:
        return (
            params.get("controlnet_enabled") and 
            params.get("controlnet_model_name") and
            params.get("controlnet_ref_image_filename")
        )
    
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """Add ControlNet preprocessors and apply."""
        
        ref_image_file = params["controlnet_ref_image_filename"]
        cn_model = params["controlnet_model_name"]
        cn_strength = params.get("controlnet_strength", 1.0)
        preprocessors = params.get("controlnet_preprocessors", {})
        
        # Load reference image
        load_img_id, _ = ctx.add_node(
            "LoadImage",
            {"image": ref_image_file},
            "CN Load Ref Image"
        )
        current_image_ref = ctx.get_ref(load_img_id, 0)
        
        # Apply preprocessor chain
        if preprocessors.get("anyLine"):
            style = params.get("selected_anyline_style", "lineart_realistic")
            resolution = params.get("cn_anyline_resolution", 1152)
            anyline_id, _ = ctx.add_node(
                "AnyLineArtPreprocessor_aux",
                {
                    "image": current_image_ref,
                    "merge_with_lineart": style,
                    "resolution": resolution,
                    "lineart_lower_bound": 0.0,
                    "lineart_upper_bound": 1.0,
                    "object_min_size": 36,
                    "object_connectivity": 1,
                },
                "CN: AnyLine"
            )
            current_image_ref = ctx.get_ref(anyline_id, 0)
        
        if preprocessors.get("depth"):
            depth_model = params.get("cn_depth_model", "depth_anything_v2_vitl.pth")
            resolution = params.get("cn_depth_resolution", 1472)
            depth_id, _ = ctx.add_node(
                "DepthAnythingV2Preprocessor",
                {
                    "image": current_image_ref,
                    "ckpt_name": depth_model,
                    "resolution": resolution,
                },
                "CN: Depth"
            )
            current_image_ref = ctx.get_ref(depth_id, 0)
        
        if preprocessors.get("openPose"):
            resolution = params.get("cn_openpose_resolution", 1024)
            pose_id, _ = ctx.add_node(
                "OpenposePreprocessor",
                {
                    "image": current_image_ref,
                    "resolution": resolution,
                    "detect_hand": "enable",
                    "detect_body": "enable",
                    "detect_face": "enable",
                    "scale_stick_for_xinsr_cn": "disable",
                },
                "CN: OpenPose"
            )
            current_image_ref = ctx.get_ref(pose_id, 0)
        
        if preprocessors.get("canny"):
            resolution = params.get("cn_canny_resolution", 192)
            canny_id, _ = ctx.add_node(
                "CannyEdgePreprocessor",
                {
                    "image": current_image_ref,
                    "low_threshold": 100,
                    "high_threshold": 200,
                    "resolution": resolution,
                },
                "CN: Canny"
            )
            current_image_ref = ctx.get_ref(canny_id, 0)
        
        # Preview preprocessor output
        preview_id, _ = ctx.add_node(
            "PreviewImage",
            {"images": current_image_ref},
            "CN Preprocessor Preview"
        )
        ctx.preview_node_id = preview_id
        
        # Load ControlNet model
        cn_loader_id, _ = ctx.add_node(
            "ControlNetLoader",
            {"control_net_name": cn_model},
            "Load ControlNet"
        )
        cn_model_ref = ctx.get_ref(cn_loader_id, 0)
        
        # Apply ControlNet
        cn_apply_id, _ = ctx.add_node(
            "ControlNetApplyAdvanced",
            {
                "positive": ctx.positive_cond_ref,
                "negative": ctx.negative_cond_ref,
                "control_net": cn_model_ref,
                "image": current_image_ref,
                "strength": cn_strength,
                "start_percent": 0.0,
                "end_percent": 1.0,
            },
            "Apply ControlNet"
        )
        ctx.positive_cond_ref = ctx.get_ref(cn_apply_id, 0)
        ctx.negative_cond_ref = ctx.get_ref(cn_apply_id, 1)
        
        print(f"[ControlNetModule] Applied {cn_model} with strength={cn_strength}")
