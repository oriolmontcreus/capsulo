# FileUpload Components

This directory contains the modular components that make up the FileUpload field.

## Component Structure

### FileUploadError.tsx
- Displays temporary error notifications with auto-dismiss
- Shows validation errors (file too large, wrong type, etc.)
- Includes manual dismiss button

### FileUploadDropZone.tsx
- Main drop zone UI for file selection
- Handles drag and drop interactions
- Shows accepted formats and file constraints
- Displays system errors when upload is unavailable

### FileUploadItem.tsx
- **UploadedFileItem**: Displays successfully uploaded files
- **QueuedFileItem**: Displays files being processed/uploaded
- Handles file preview for PDF, audio, and video files
- Shows file icons, names, sizes, and status

### FileUploadList.tsx
- Container for all file items (uploaded + queued)
- Manages the list of files
- Provides "Remove all files" button

## Usage

These components are used internally by `fileUpload.field.tsx` and should not be imported directly in schemas. Use the `FileUpload` builder instead:

```typescript
FileUpload('myFiles')
  .label('Upload Files')
  .accept('image/*,audio/*')
  .maxSize(10 * 1024 * 1024) // 10MB
  .maxFiles(5)
  .multiple(true)
```

## Benefits of Modular Structure

1. **Maintainability**: Each component has a single responsibility
2. **Testability**: Components can be tested in isolation
3. **Reusability**: Components can be reused in other contexts
4. **Readability**: Smaller files are easier to understand
5. **Performance**: React can optimize re-renders better with smaller components
