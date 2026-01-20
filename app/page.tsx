import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="glass-card p-8 rounded-2xl">
            <h1 className="font-serif text-4xl text-white mb-2">Document Generator</h1>
            <p className="text-gray-400">Welcome to the Fifth Avenue AI Dashboard. Select an action below to get started.</p>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Project */}
            <div className="glass-card p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="h-12 w-12 rounded-lg bg-teal-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">+</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">New Project</h3>
              <p className="text-sm text-gray-400">Start a new document generation project from a template.</p>
            </div>

            {/* Manage Brand Kit */}
            <div className="glass-card p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Brand Kit</h3>
              <p className="text-sm text-gray-400">Manage logos, colors, and fonts for your documents.</p>
            </div>

            {/* Templates */}
            <div className="glass-card p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Templates</h3>
              <p className="text-sm text-gray-400">View and edit available document templates.</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
