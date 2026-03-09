# Utility Parser UI

A visual JSON mapping tool for creating utility integration templates. Built with Next.js, React Flow, and Tailwind CSS.

## Features

- **cURL Import**: Paste any cURL command to automatically extract API details (URL, method, headers, body)
- **Visual Spider-Web Mapper**: Drag-and-drop wire connections between source and target fields
- **Table Mapper**: Traditional table-based field mapping for precise control
- **Multi-Step Workflow Builder**: Create workflows with multiple steps (TOKEN → QUERY → PAYMENT)
- **Test Console**: Execute workflows against your backend API
- **Collections Manager**: Browse, edit, import/export template collections

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd utility-parser-ui
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

### 1. Create a New Template

1. Go to the **Template Builder** tab
2. Enter a Collection Name and Template Code
3. Add workflow steps using the **+** button

### 2. Import from cURL

1. Click on **cURL Import** tab
2. Paste your cURL command (from Postman, browser dev tools, etc.)
3. Click **Parse cURL** to extract the API details
4. Click **Apply to Current Step** to populate the template

Example cURL:
```bash
curl -X POST 'https://api.example.com/auth/token' \
  -H 'Content-Type: application/json' \
  -d '{"client_id": "xxx", "client_secret": "yyy"}'
```

### 3. Visual Mapping (Spider-Web Style)

1. Go to **Visual Mapper** tab
2. You'll see source fields on the left (from request body, accumulated data, context, credentials)
3. Target fields on the right (API request body fields)
4. **Drag a wire** from a source field handle to a target field handle
5. Add custom fields using the input boxes at the top

### 4. Table Mapping

For precise control, use the **Request Mapping** or **Response Mapping** tabs:
- Add rows for each field mapping
- Select source type (request, accumulated, context, credentials, static)
- Enter the source field path and target field

### 5. Test Your Workflow

1. Go to **Test Console** tab
2. Set the API Base URL (default: http://localhost:8080)
3. Click **Initialize Test**
4. Fill in required input fields
5. Click **Start Workflow** to execute
6. View request/response data for each step

### 6. Export & Import

- **Export JSON**: Download the template as a JSON file
- **Import JSON**: Load an existing template file
- **Collections**: View and manage all templates from the Collections tab

## Configuration

### API Base URL

Set the backend API URL in:
- Header input field (top-right)
- Test Console settings

Default: `http://localhost:8080`

### Backend API Endpoints Used

- `POST /api/v1/cbesuperapp/utility/proxy/initial` - Start workflow
- `POST /api/v1/cbesuperapp/utility/proxy/process` - Process step
- `GET /api/v1/cbesuperapp/utility/collections` - List collections
- `POST /api/v1/cbesuperapp/utility/collections` - Create collection
- `PUT /api/v1/cbesuperapp/utility/collections/{code}` - Update collection
- `DELETE /api/v1/cbesuperapp/utility/collections/{code}` - Delete collection

## Project Structure

```
utility-parser-ui/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── CurlParser.tsx      # cURL parsing component
│   │   ├── SpiderWebMapper.tsx # Visual wire-based mapper
│   │   ├── TableMapper.tsx     # Table-based mapper
│   │   ├── TemplateBuilder.tsx # Main template editor
│   │   ├── TestConsole.tsx     # Workflow testing
│   │   └── CollectionsManager.tsx
│   ├── lib/
│   │   ├── store.ts           # Zustand state management
│   │   └── utils.ts           # Utility functions
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Technologies

- **Next.js 14** - React framework
- **React Flow** - Visual node-based editor
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State management
- **Lucide React** - Icons

## License

MIT
