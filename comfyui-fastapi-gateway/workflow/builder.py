"""
WorkflowBuilder - Main orchestrator for building ComfyUI workflows.
"""
import json
from typing import Dict, Any, Optional, List, Tuple

from .context import WorkflowContext
from .params import validate_params
from .modules import (
    BaseModule,
    LoaderModule,
    LoraModule,
    ModelMergeModule,
    SamplingDiscreteModule,
    ConditioningModule,
    ClipVisionModule,
    ControlNetModule,
    SamplerModule,
    HiresFixModule,
    OutputModule,
)


class WorkflowBuilder:
    """
    Builds ComfyUI workflows using a modular pipeline approach.
    
    The pipeline runs modules in order:
    1. Loader (checkpoint)
    2. Model modifiers (LoRAs, merge, sampling discrete)
    3. Conditioning (CLIP, ClipVision, ControlNet)
    4. Sampler (KSampler)
    5. Postprocess (HiresFix)
    6. Output (Image Saver)
    """
    
    def __init__(self, client_id: str = "workflow_builder"):
        self.client_id = client_id
        
        # Default module pipeline order
        self.modules: List[BaseModule] = [
            LoaderModule(),
            ModelMergeModule(),      # NEW: Merge before LoRAs
            LoraModule(),
            SamplingDiscreteModule(), # NEW: After model modifications
            ConditioningModule(),
            ClipVisionModule(),
            ControlNetModule(),
            SamplerModule(),
            HiresFixModule(),
            OutputModule(),
        ]
        
        print(f"[WorkflowBuilder] Initialized with {len(self.modules)} modules")
    
    def build(self, params: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
        """
        Build a complete workflow from parameters.
        
        Args:
            params: Generation parameters from the frontend
            
        Returns:
            Tuple of (workflow_nodes_dict, preview_node_id)
        """
        # Validate and apply defaults
        validated_params = validate_params(params)
        
        print(f"[WorkflowBuilder] Building workflow for client: {self.client_id}")
        print(f"[WorkflowBuilder] Params keys: {list(validated_params.keys())}")
        
        # Create fresh context
        ctx = WorkflowContext()
        
        # Run each module in order
        for module in self.modules:
            module_name = module.get_name()
            
            if module.should_run(validated_params):
                print(f"[WorkflowBuilder] Running: {module_name}")
                try:
                    module.build(ctx, validated_params)
                except Exception as e:
                    print(f"[WorkflowBuilder] ERROR in {module_name}: {e}")
                    raise
            else:
                print(f"[WorkflowBuilder] Skipping: {module_name}")
        
        print(f"[WorkflowBuilder] Complete. Total nodes: {len(ctx.nodes)}")
        
        return ctx.nodes, ctx.preview_node_id
    
    def build_preview_workflow(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build a minimal workflow for ControlNet preprocessor preview.
        Only runs loader and ControlNet preprocessing, no sampling.
        
        Args:
            params: Parameters with controlnet settings
            
        Returns:
            Workflow nodes dict
        """
        validated_params = validate_params(params)
        
        print(f"[WorkflowBuilder] Building PREVIEW workflow")
        
        ctx = WorkflowContext()
        
        # Only run ControlNet module for preview
        # We need to manually load the image and run preprocessors
        if not validated_params.get("controlnet_ref_image_filename"):
            print("[WorkflowBuilder] No reference image for preview")
            return {}
        
        cn_module = ControlNetModule()
        
        # Load reference image directly
        load_img_id, _ = ctx.add_node(
            "LoadImage",
            {"image": validated_params["controlnet_ref_image_filename"]},
            "Load Ref Image (Preview)"
        )
        current_image_ref = ctx.get_ref(load_img_id, 0)
        
        # Apply preprocessor chain (simplified from ControlNetModule)
        preprocessors = validated_params.get("controlnet_preprocessors", {})
        
        if preprocessors.get("anyLine"):
            style = validated_params.get("selected_anyline_style", "lineart_realistic")
            resolution = validated_params.get("cn_anyline_resolution", 1152)
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
                "Preview: AnyLine"
            )
            current_image_ref = ctx.get_ref(anyline_id, 0)
        
        if preprocessors.get("depth"):
            depth_model = validated_params.get("cn_depth_model", "depth_anything_v2_vitl.pth")
            resolution = validated_params.get("cn_depth_resolution", 1472)
            depth_id, _ = ctx.add_node(
                "DepthAnythingV2Preprocessor",
                {
                    "image": current_image_ref,
                    "ckpt_name": depth_model,
                    "resolution": resolution,
                },
                "Preview: Depth"
            )
            current_image_ref = ctx.get_ref(depth_id, 0)
        
        if preprocessors.get("openPose"):
            resolution = validated_params.get("cn_openpose_resolution", 1024)
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
                "Preview: OpenPose"
            )
            current_image_ref = ctx.get_ref(pose_id, 0)
        
        if preprocessors.get("canny"):
            resolution = validated_params.get("cn_canny_resolution", 192)
            canny_id, _ = ctx.add_node(
                "CannyEdgePreprocessor",
                {
                    "image": current_image_ref,
                    "low_threshold": 100,
                    "high_threshold": 200,
                    "resolution": resolution,
                },
                "Preview: Canny"
            )
            current_image_ref = ctx.get_ref(canny_id, 0)
        
        # Final preview node
        preview_id, _ = ctx.add_node(
            "PreviewImage",
            {"images": current_image_ref},
            "FINAL PREPROCESSOR PREVIEW"
        )
        
        print(f"[WorkflowBuilder] Preview workflow built. Nodes: {len(ctx.nodes)}")
        
        return ctx.nodes
