// src/components/Home.js
import React from 'react';

const Home = () => {
  return (
    <div className="container my-5">
      <h1 className="text-center mb-4">Welcome to Fantasy Cricket League</h1>
      <p className="lead text-center">
        Build your dream team and compete with others in exciting cricket tournaments!  
        Showcase your cricket knowledge and win amazing prizes.  
      </p>
      <div className="text-center mt-4">
        <img
          src="/assets/CricketBanner.png"
          alt="Cricket Fantasy"
          className="img-fluid rounded"
        />
      </div>
    </div>
  );
};

export default Home;
