export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start text-center space-y-6 p-6">
      {/* Classroom video banner */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-64 object-cover rounded-b-lg shadow-lg mb-8"
      >
        <source src="/videos/classroom.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div>
        <h1 className="text-3xl font-bold">Welcome to Find A Teacher</h1>
        <p className="text-lg text-gray-300 mt-2">Please sign in below</p>
      </div>

      <div className="flex gap-6">
        <a
          href="/principal/login"
          className="px-6 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
        >
          Principal
        </a>
        <a
          href="/teacher/login"
          className="px-6 py-3 bg-green-600 rounded-lg text-white hover:bg-green-700 transition"
        >
          Teacher
        </a>
      </div>
    </main>
  );
}
