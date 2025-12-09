"""
Base module class for workflow building.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from ..context import WorkflowContext


class BaseModule(ABC):
    """Abstract base class for workflow modules."""
    
    @abstractmethod
    def should_run(self, params: Dict[str, Any]) -> bool:
        """
        Determine if this module should run based on params.
        
        Args:
            params: Workflow parameters
            
        Returns:
            bool: True if module should be applied
        """
        pass
    
    @abstractmethod
    def build(self, ctx: WorkflowContext, params: Dict[str, Any]) -> None:
        """
        Build/modify the workflow.
        
        Args:
            ctx: Shared workflow context
            params: Workflow parameters
        """
        pass
    
    def get_name(self) -> str:
        """Get the module name for logging."""
        return self.__class__.__name__
