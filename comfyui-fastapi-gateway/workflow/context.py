"""
WorkflowContext - Shared state passed between workflow modules.
Contains node references and helper methods for building the workflow.
"""
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List


@dataclass
class WorkflowContext:
    """Shared context passed between workflow builder modules."""
    
    # The workflow nodes dictionary
    nodes: Dict[str, Any] = field(default_factory=dict)
    
    # Node ID counter for generating unique IDs
    node_counter: int = 0
    
    # Current pipeline references (node_id, output_index)
    model_ref: Optional[List] = None
    clip_ref: Optional[List] = None
    vae_ref: Optional[List] = None
    positive_cond_ref: Optional[List] = None
    negative_cond_ref: Optional[List] = None
    latent_ref: Optional[List] = None
    pixels_ref: Optional[List] = None
    
    # Model name string reference (for Image Saver)
    model_name_str_ref: Optional[List] = None
    
    # Steps and CFG node reference
    steps_cfg_ref: Optional[List] = None
    
    # Special node IDs for tracking
    preview_node_id: Optional[str] = None
    final_saver_node_id: Optional[str] = None
    
    def get_next_node_id(self) -> str:
        """Generate the next unique node ID."""
        self.node_counter += 1
        return str(self.node_counter)
    
    def add_node(
        self, 
        class_type: str, 
        inputs: Dict[str, Any], 
        title: Optional[str] = None
    ) -> tuple[str, List]:
        """
        Add a node to the workflow.
        
        Returns:
            tuple: (node_id, [node_id, 0]) - the ID and a reference to output 0
        """
        node_id = self.get_next_node_id()
        self.nodes[node_id] = {
            "class_type": class_type,
            "inputs": inputs
        }
        if title:
            self.nodes[node_id]["_meta"] = {"title": title}
        return node_id, [node_id, 0]
    
    def get_ref(self, node_id: str, output_index: int = 0) -> List:
        """Create a node reference [node_id, output_index]."""
        return [node_id, output_index]
