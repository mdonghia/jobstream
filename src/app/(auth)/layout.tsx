export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#0A2540]">JobStream</h1>
          <p className="text-sm text-[#8898AA] mt-1">Field Service Management</p>
        </div>
        {children}
      </div>
    </div>
  )
}
