// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Register from './components/Register';
import Login from './components/Login';  // Import Login Component
import Dashboard from './components/Dashboard'; // Import Dashboard Component
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import ManagerDashboard from './components/ManagerDashboard';
import AddClub from './components/AddClub';
import ManageClubs from './components/ManageClub';
import EditClub from './components/EditClub';
import AddMatch from './components/AddMatch';
import ManageMatches from './components/ManageMatches';
import EditMatch from './components/EditMatch';
import AddMembers from './components/AddMembers';
import ManageMembers from './components/ManageMembers';
import ManageMatch from './components/ManageMatch'; // Add this
import AddGroup from './components/AddGroup'; // Add this
import EditGroup from './components/EditGroup'; // Add this
import GroupList from './components/GroupList';
import PlaceBet from './components/PlaceBet';
import ViewBets from './components/ViewBets';
import AddResult from './components/AddResult';
import MyBets from './components/MyBets';
import WalletHistory from './components/WalletHistory';
import ManagerWalletHistory from './components/ManagerWalletHistory';
import AdminWalletHistory from './components/AdminWallethistory';
import MatchResult from './components/MatchResult';
import ManagerMatchResult from './components/ManagerMatchResult';
import ManagerViewBets from './components/ManagerViewBets';
import AdminManageMatches from './components/AdminManageMatches';
import AdminAddMatch from './components/AdminAddMatch';
import AdminEditMatch from './components/AdminEditMatch';
import AdminAddResult from './components/AdminAddResult';
import AdminMatchResult from './components/AdminMatchResult';
import AdminManageMatch from './components/AdminManageMatch';
import AdminAddGroup from './components/AdminAddGroup';
import AdminEditGroup from './components/AdminEditGroup';
import AdminViewBets from './components/AdminViewBets';
import AdminManageMembers from './components/AdminManagerMembers';
import AdminAddMembers from './components/AdminAddMembers';
import ChangePassword from './components/ChangePassword';
import ViewBettingSheet from './components/ViewBettingSheet';
import AdminViewBettingSheet from './components/AdminViewBettingSheet';
import AddPlayers from './components/AddPlayers';
import AdminAddPlayers from './components/AdminAddPlayers';
import Referral from './components/Referral';

import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';



const App = () => {
  return (
    <Router>
      <Header />
      <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute allowedUserType="Member">
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin-dashboard" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/manager-dashboard" 
          element={
            <PrivateRoute allowedUserType="Manager">
              <ManagerDashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/admin-dashboard/add-club" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <AddClub />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin-dashboard/manage-club" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <ManageClubs />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/admin-dashboard/edit-club/:id" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <EditClub />
            </PrivateRoute>
          } 
        />

      <Route 
          path="/manager-dashboard/Add-Match" 
          element={
            <PrivateRoute allowedUserType="Manager">
              <AddMatch/>
            </PrivateRoute>
          } 
        />

        <Route 
          path="/manager-dashboard/Manage-Matches" 
          element={
            <PrivateRoute allowedUserType="Manager">
              <ManageMatches />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/manager-dashboard/Manage-Matches/edit/:id" 
          element={
            <PrivateRoute allowedUserType="Manager">
              <EditMatch/>
            </PrivateRoute>
          } 
        />

          <Route 
            path="/manager-dashboard/add-members" 
            element={
              <PrivateRoute allowedUserType="Manager">
                <AddMembers />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/manager-dashboard/manage-members" 
            element={
              <PrivateRoute allowedUserType="Manager">
                <ManageMembers />
              </PrivateRoute>
            } 
          />

          <Route
            path="/manager-dashboard/manage-match/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <ManageMatch />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager-dashboard/add-group/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <AddGroup />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager-dashboard/edit-group/:groupId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <EditGroup />
              </PrivateRoute>
            }
          />

          <Route
            path="/play-match/:matchId"
            element={
              <PrivateRoute allowedUserType="Member">
                <GroupList />
              </PrivateRoute>
            }
          />
          <Route
            path="/place-bet/:groupId"
            element={
              <PrivateRoute allowedUserType="Member">
                <PlaceBet />
              </PrivateRoute>
            }
          />
          <Route
            path="/view-bets/:groupId"
            element={
              <PrivateRoute allowedUserType="Member">
                <ViewBets />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager-dashboard/Manage-Matches/add-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <AddResult />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager-dashboard/Manage-Matches/edit-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <AddResult />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/my-bets"
            element={
              <PrivateRoute allowedUserType="Member">
                <MyBets />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/wallet-history"
            element={
              <PrivateRoute allowedUserType="Member">
                <WalletHistory />
              </PrivateRoute>
            }
          />

          <Route
            path="/manager-dashboard/wallet-history"
            element={
              <PrivateRoute allowedUserType="Manager">
                <ManagerWalletHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-dashboard/wallet-history"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminWalletHistory />
              </PrivateRoute>
            }
          />

          <Route
            path="/match-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Member">
                <MatchResult />
              </PrivateRoute>
            }
          />

          <Route
            path="/manager-dashboard/Manage-Matches/view-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <ManagerMatchResult />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager-dashboard/view-bets/:groupId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <ManagerViewBets />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/manage-club/:clubId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminManageMatches />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-dashboard/manage-club/:clubId/add-match"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminAddMatch />
              </PrivateRoute>
            }
          />

        <Route 
          path="/admin-dashboard/Manage-Matches/edit/:id" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <AdminEditMatch/>
            </PrivateRoute>
          } 
        />

        <Route 
          path="/admin-dashboard/Manage-Matches/add-result/:matchId" 
          element={
            <PrivateRoute allowedUserType="Admin">
              <AdminAddResult/>
            </PrivateRoute>
          } 
        />

          <Route
            path="/admin-dashboard/Manage-Matches/edit-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminAddResult />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/Manage-Matches/view-result/:matchId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminMatchResult />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/manage-match/:matchId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminManageMatch />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/add-group/:matchId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminAddGroup />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/edit-group/:groupId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminEditGroup />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/view-bets/:groupId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminViewBets />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/manage-members/:clubId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminManageMembers />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/add-members/:clubId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminAddMembers />
              </PrivateRoute>
            }
          />

          <Route
            path="/change-password"
            element={
                <ChangePassword />
            }
          />

          <Route
            path="/manager-dashboard/view-bettingsheet/:groupId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <ViewBettingSheet />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/view-bettingsheet/:groupId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminViewBettingSheet />
              </PrivateRoute>
            }
          />

          <Route
            path="/manager-dashboard/Manage-Matches/add-players/:matchId"
            element={
              <PrivateRoute allowedUserType="Manager">
                <AddPlayers />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin-dashboard/Manage-Matches/add-players/:matchId"
            element={
              <PrivateRoute allowedUserType="Admin">
                <AdminAddPlayers />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/referral"
            element={
              <PrivateRoute allowedUserType="Member">
                <Referral />
              </PrivateRoute>
            }
          />
                

      </Routes>

      

      
      </main>
      <Footer />
    </Router>
  );
};

export default App;
