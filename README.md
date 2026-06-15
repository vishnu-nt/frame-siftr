# Frame Siftr

A React TypeScript application for categorizing and labeling large collections of images. Built with a clean architecture that mimics the Cursor app interface.

## Features

- **Folder Upload**: Upload entire folders containing thousands of images
- **Virtualized Grid**: Efficient rendering of large image collections using react-window
- **Web Workers**: Offload image processing to prevent UI blocking
- **Category Management**: Create, edit, and delete custom categories with color coding
- **Image Labeling**: Right-click or use context menu to assign categories to images
- **Full-Screen Viewer**: Click images to view them in full-screen with zoom and navigation
- **Data Persistence**: All data is stored in IndexedDB for offline access
- **Resume Functionality**: Continue where you left off when returning to the app
- **Export/Import**: Download your categorization data as JSON or import existing projects
- **Progress Tracking**: Visual progress bar showing labeling completion status

## Architecture

### Clean Architecture Principles
- **Separation of Concerns**: UI components, business logic, and data access are separated
- **Dependency Injection**: Services are injected through hooks and context
- **Type Safety**: Full TypeScript coverage with comprehensive interfaces
- **Testability**: Components and services are designed for easy testing

### Key Components

#### UI Layer
- `Layout`: Main application layout with sidebar and content area
- `Sidebar`: Category and file tree navigation
- `Navbar`: Upload controls and progress tracking
- `ImageGrid`: Virtualized grid for efficient image display
- `ImageThumbnail`: Individual image component with labeling
- `ImageViewer`: Full-screen image viewing with zoom controls
- `CategoryManager`: Modal for managing categories

#### Business Logic
- `useAppState`: Orchestrates application state by coordinating modular sub-hooks (`useSelection`, `useProjects`, `useLabels`, `useImages`, `useExportImport`, `useViewerNavigation`)
- `FileUploadService`: Handles file processing and validation
- `ImageWorkerService`: Web Worker wrapper for image processing

#### Data Layer
- `DatabaseService`: IndexedDB wrapper for data persistence
- `ImageProcessor` (Worker): Background image processing

## Getting Started

### Prerequisites
- Node.js 16+ (recommended: 18+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd image-categorizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Usage

### 1. Upload Images
- Click "Upload Folder" in the navbar
- Select a folder containing images
- The app will process and display all supported image formats

### 2. Create Categories
- Click "Categories" in the navbar
- Click "Create New Category"
- Enter a name and choose a color
- Categories help organize your images

### 3. Label Images
- Right-click on any image thumbnail
- Select a category from the context menu
- Images will be marked with the category color
- Progress is tracked in the navbar

### 4. View Images
- Click any image thumbnail to open full-screen viewer
- Use +/- keys or buttons to zoom
- Use arrow keys to navigate between images
- Press ESC or click X to close

### 5. Navigate Categories
- Use the sidebar to filter by category
- Click "All Images" to see everything
- Click specific categories to filter view
- See file counts for each category

### 6. Browse by folder
- Use the **Folders** section in the sidebar to see the upload folder structure
- Click a folder to filter the grid; combine with label filters

### 7. Export Data
- Click "Export Data" in the sidebar
- Downloads JSON v2 with `relativePath` for each labeled image (requires folder upload)
- Use this to backup work or run the organize script locally

### 8. Organize files on disk
After labeling, copy files into category folders on your machine:

1. Place the exported JSON in the **same folder you selected** when uploading (the upload root).
2. From that directory, run:

```bash
chmod +x scripts/organize-from-export.sh
./scripts/organize-from-export.sh ./your-export.json
```

Options:
- `--preserve` (default): `organized/<label>/subdir/image.jpg`
- `--flat`: `organized/<label>/image.jpg` (may collide if same filename in different folders)
- `--output-dir DIR`: change output location (default: `./organized`)
- `--force`: overwrite existing files
- `--strict`: exit with error if any source file is missing

Requires [jq](https://jqlang.github.io/jq/).

### 9. Import Data
- Click "Import Data" in the sidebar
- Select a previously exported JSON file
- Continue working with your existing categories and labels

## Data Schema

The application uses a JSON schema to store categorization data:

```typescript
interface ExportAssignment {
  relativePath: string;  // path within upload root, e.g. "vacation/img.jpg"
  filename: string;
  size: number;
  lastModified: number;
  label: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: number;
}

interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  categories: Category[];
  labels: ImageLabel[];
  totalImages: number;
  labeledImages: number;
}
```

## Performance Optimizations

- **Virtualization**: Only renders visible images in the grid
- **Web Workers**: Image processing happens in background threads
- **Lazy Loading**: Images are loaded only when needed
- **Memory Management**: Proper cleanup of object URLs
- **IndexedDB**: Efficient client-side storage for large datasets

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Development

### AI / agent documentation

- **[AGENTS.md](./AGENTS.md)** — architecture, conventions, terminology, and where to change code (for Cursor, Claude Code, Codex, etc.)
- **[CLAUDE.md](./CLAUDE.md)** — entry point for Claude Code (links to AGENTS.md)

### Project Structure
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── workers/            # Web Worker files
└── App.tsx            # Main application component
```

### Adding New Features

1. **New Component**: Add to `src/components/`
2. **Business Logic**: Add to `src/services/` or `src/hooks/`
3. **Types**: Define in `src/types/index.ts`
4. **Worker Tasks**: Add to `src/workers/`

### Code Style
- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling
- Add comprehensive type definitions

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please create an issue in the repository.