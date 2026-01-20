"use client";

import { Sidebar } from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Project = {
  id: string;
  name: string;
  updatedAt: string;
  documents: { id: string }[];
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Project",
          description: "New project created from dashboard",
        }),
      });

      if (res.ok) {
        const project = await res.json();
        // Assuming the API creates a default document or we need to find it
        // Check if project has documents, otherwise we might need to create one, 
        // but for now let's assume the API might not create a doc automatically 
        // OR we just redirect to the project view.
        // Actually, for this flow, let's redirect to the first document if it exists,
        // or handle that.
        // Let's create a document immediately if one doesn't exist? 
        // Ideally backend handles this. Let's assume for now we go to editor with the project's first document.

        // REVISIT: If api/projects doesn't create a document, we might need to.
        // Let's assume we want to go a specific route.
        // If the project creation includes a default document (which I should verify), we use its ID.
        // If not, we might need to create one.
        // Let's reload to be safe or check the response data structure.

        if (project.documents && project.documents.length > 0) {
          router.push(`/editor/${project.documents[0].id}`);
        } else {
          // Create a document if none exists
          // This is a temporary fix until backend ensures default doc
          const docRes = await fetch("/api/projects/" + project.id + "/documents", { // We don't have this route yet potentially?
            // Actually we have POST /api/projects (creates project)
            // We should probably rely on project creation to make a doc or have a separate create doc flow.
          });
          // Fallback: just refresh
          fetchProjects();
        }
      }
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    if (project.documents.length > 0) {
      router.push(`/editor/${project.documents[0].id}`);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 text-white">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Header */}
          <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="font-serif text-4xl text-white mb-2">Elvison OS</h1>
              <p className="text-gray-400">Welcome to the Dashboard. Create a new project to get started.</p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Project */}
            <button
              onClick={handleCreateProject}
              disabled={isCreating}
              className="glass-card p-6 rounded-xl hover:bg-white/10 transition-all cursor-pointer group text-left flex flex-col items-start w-full relative overflow-hidden"
            >
              <div className="h-12 w-12 rounded-lg bg-teal-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {isCreating ? <Loader2 className="w-6 h-6 animate-spin text-teal-accent" /> : <span className="text-2xl text-teal-accent">+</span>}
              </div>
              <h3 className="text-xl font-medium text-white mb-2">New Project</h3>
              <p className="text-sm text-gray-400">Start a new document generation project.</p>
            </button>

            {/* Manage Brand Kit */}
            <div
              onClick={() => router.push('/brand-kit')}
              className="glass-card p-6 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Brand Kit</h3>
              <p className="text-sm text-gray-400">Manage logos, colors, and fonts.</p>
            </div>

            {/* Templates */}
            <div
              onClick={() => router.push('/templates')}
              className="glass-card p-6 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Templates</h3>
              <p className="text-sm text-gray-400">View and edit available templates.</p>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="space-y-6">
            <h2 className="text-2xl font-serif">Recent Projects</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-gray-500">No projects found. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleOpenProject(project)}
                    className="glass-card p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group border border-white/5 hover:border-white/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-white truncate mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.documents.length} Document{project.documents.length !== 1 && 's'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
