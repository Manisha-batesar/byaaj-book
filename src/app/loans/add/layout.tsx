import React from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <React.Suspense fallback={<></>}>
      {children}
    </React.Suspense>
  )
}

export default layout