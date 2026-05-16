import React from 'react';
import { Navbar } from '../components/Navbar';
import { BikeSearch } from '../components/BikeSearch';

export const BikeSearchPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bike Search</h1>
        <BikeSearch />
      </main>
    </div>
  );
};
