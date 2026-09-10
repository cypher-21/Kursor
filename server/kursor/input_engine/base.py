from abc import ABC, abstractmethod

class InputBackend(ABC):
    """Abstract base class for mouse and keyboard input injection on Linux."""

    @abstractmethod
    def move(self, dx: float, dy: float) -> None:
        """Move cursor by relative delta (dx, dy)."""
        pass

    @abstractmethod
    def click(self, button: str = "left", state: str = "click") -> None:
        """
        Handle mouse click/press/release.
        button: 'left', 'right', 'middle'
        state: 'click', 'down', 'up'
        """
        pass

    @abstractmethod
    def scroll(self, dx: float, dy: float) -> None:
        """Scroll vertically (dy) and horizontally (dx)."""
        pass

    @abstractmethod
    def press_key(self, key_name: str) -> None:
        """Press and release a specific key (e.g., 'Page_Down', 'Page_Up', 'F5', 'Escape', 'b', 'w')."""
        pass

    @abstractmethod
    def type_text(self, text: str) -> None:
        """Type a string of characters."""
        pass

    @abstractmethod
    def gesture(self, action: str) -> None:
        """Execute a desktop gesture: 'overview', 'desktop', 'workspace_next', 'workspace_prev'."""
        pass

    def cleanup(self) -> None:
        """Clean up backend resources."""
        pass
