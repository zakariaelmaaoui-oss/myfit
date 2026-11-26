import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Layout } from './app/Layout';
import { Home } from './features/home';
import { SystemChat } from './features/system';
import { Awaken, Library, Nutrition, Profile, Progress, Quests, Workout } from './features/pages';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Layout><Routes>
  <Route path="/" element={<Home />} /><Route path="/system" element={<SystemChat />} /><Route path="/nutrition" element={<Nutrition />} />
  <Route path="/library" element={<Library />} /><Route path="/workout" element={<Workout />} /><Route path="/quests" element={<Quests />} />
  <Route path="/progress" element={<Progress />} /><Route path="/profile" element={<Profile />} /><Route path="/awaken" element={<Awaken />} />
  <Route path="*" element={<Home />} />
</Routes></Layout></BrowserRouter></React.StrictMode>);
