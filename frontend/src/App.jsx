import React, { useState } from 'react'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePage from './pages/HomePage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import QueryBox from './components/QueryBox.jsx';
import Results from './components/Results.jsx';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<HomePage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="top-center"
        autoClose={1500}
        theme="light"
        pauseOnHover
        newestOnTop
        closeOnClick
      />
    </>
  )
}

export default App





