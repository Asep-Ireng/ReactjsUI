"""
Parameter validation and default values for workflow generation.
"""
from typing import Dict, Any


# Default values for all workflow parameters
DEFAULTS = {
    # Main generation
    "steps": 20,
    "cfg": 7.0,
    "width": 512,
    "height": 512,
    "denoise": 1.0,
    "batch_size": 1,
    "clipskip": -2,
    "sampler_name": "euler_ancestral",
    "scheduler": "normal",
    
    # HiresFix
    "hf_scale": 1.5,
    "hf_denoising_strength": 0.4,
    "hf_upscaler": "RealESRGAN_x4.pth",
    "hf_steps": 15,
    "hf_cfg": 7.0,
    "hf_colortransfer": "none",
    
    # ControlNet
    "controlnet_strength": 1.0,
    "selected_anyline_style": "lineart_realistic",
    "cn_anyline_resolution": 1152,
    "cn_depth_model": "depth_anything_v2_vitl.pth",
    "cn_depth_resolution": 1472,
    "cn_openpose_resolution": 1024,
    "cn_canny_resolution": 192,
    
    # ClipVision
    "clipvision_strength": 1.0,
    
    # Output
    "output_filename_format": "%time_%seed",
    "output_path_format": "%date",
    
    # Model Merge (NEW)
    "model_merge_ratio": 0.5,
    
    # Sampling Discrete (NEW)
    "sampling_type": "eps",
    "zsnr_enabled": False,
}


def get_param(params: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Get a parameter value, using default if None or not present."""
    value = params.get(key)
    if value is not None:
        return value
    if default is not None:
        return default
    return DEFAULTS.get(key)


def validate_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and apply defaults to workflow parameters.
    Returns a new dict with validated parameters.
    """
    validated = dict(params)  # Copy input
    
    # Apply defaults for missing values
    for key, default_value in DEFAULTS.items():
        if key not in validated or validated[key] is None:
            validated[key] = default_value
    
    # Map 'loops' to 'batch_size' if present
    if "loops" in validated:
        validated["batch_size"] = validated["loops"]
    
    return validated
