// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // Initialize Lucide icons
    lucide.createIcons();

    // Get references to the DOM elements
    const container = document.getElementById('draggable-container');
    const dragHandle = document.getElementById('drag-handle');
    const resizeHandle = document.getElementById('resize-handle');

    // --- Dragging Logic ---
    let isDragging = false;
    let offsetX, offsetY;

    // Event listener for when the mouse button is pressed down on the drag handle
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        
        // Calculate the mouse's offset from the top-left corner of the container
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
        
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
    });

    // Event listener for when the mouse moves anywhere in the document
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return; // Do nothing if not dragging
        
        // Calculate the new position of the container
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Constrain the container within the viewport boundaries
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - containerHeight));

        // Apply the new position
        container.style.left = `${newX}px`;
        container.style.top = `${newY}px`;
    });

    // Event listener for when the mouse button is released
    document.addEventListener('mouseup', () => {
        isDragging = false;
        
        // Re-enable text selection
        document.body.style.userSelect = '';
    });

    // --- Resizing Logic ---
    let isResizing = false;

    // Event listener for when the mouse button is pressed down on the resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        
        // Stop the event from bubbling up to the drag handle
        e.stopPropagation(); 
        
        // Prevent text selection while resizing
        document.body.style.userSelect = 'none';
    });

    // Event listener for when the mouse moves anywhere in the document
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return; // Do nothing if not resizing
        
        // Calculate the new dimensions of the container based on mouse position
        const newWidth = e.clientX - container.offsetLeft;
        const newHeight = e.clientY - container.offsetTop;
        
        // Apply the new dimensions
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
    });

    // Event listener for when the mouse button is released
    document.addEventListener('mouseup', () => {
        isResizing = false;
        
        // Re-enable text selection
        document.body.style.userSelect = '';
    });
});
