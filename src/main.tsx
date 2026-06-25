import React from 'react';
import { createRoot } from 'react-dom/client';
import { DemoApp } from './app/demo.js';

const root = document.getElementById('root')!;
createRoot(root).render(React.createElement(DemoApp));
