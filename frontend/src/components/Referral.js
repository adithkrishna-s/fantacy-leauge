// /var/www/fantasy-league/frontend/src/components/Referral.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const Referral = () => {
  const [referralData, setReferralData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get('/api/users/referral-stats', config);
        setReferralData(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch referral data');
      }
    };

    fetchReferralData();
  }, []);

  // Update the handleSendInvite function in Referral.js
    const handleSendInvite = async () => {
        if (!phoneNumber) {
        toast.error('Please enter a phone number');
        return;
        }
    
        // Basic phone number validation
        if (!/^\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
        toast.error('Please enter a valid phone number (10-15 digits)');
        return;
        }
    
        setLoading(true);
        try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const referralLink = `https://fantacyleauge.com/register?ref=${referralData.referralCode}`;
        
        await axios.post(
            '/api/users/send-whatsapp', 
            {
            phoneNumber: phoneNumber.replace(/\s/g, '')
            },
            {
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            }
            }
        );
    
        toast.success(
            <div>
            <p>Invite sent successfully to {phoneNumber}!</p>
            <p className="small">They'll receive a WhatsApp message shortly.</p>
            </div>
        );
        setPhoneNumber('');
        } catch (error) {
        console.error('Invite error:', error);
        toast.error(
            error.response?.data?.message || 
            'Failed to send invite. Please try again later.'
        );
        } finally {
        setLoading(false);
        }
    };

    if (!referralData) return <div>Loading...</div>;

    const referralLink = `https://fantacyleauge.com/register?ref=${referralData.referralCode}`;

    return (
        <MemberLayout>
        <ToastContainer />
        <div className="container my-5">
            <h2 className="text-center mb-4">Referral Program</h2>
            
            <div className="card mb-4">
            <div className="card-body">
                <h5 className="card-title">Your Referral Stats</h5>
                <div className="row">
                <div className="col-md-4">
                    <div className="stat-card">
                    <h3>{referralData.referralCount}</h3>
                    <p>Referred Friends</p>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                    <h3>RS{referralData.referralEarnings.toFixed(2)}</h3>
                    <p>Total Earnings</p>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                    <h3>5%</h3>
                    <p>Commission Rate</p>
                    </div>
                </div>
                </div>
            </div>
            </div>

            <div className="card mb-4">
            <div className="card-body">
                <h5 className="card-title">Your Referral Link</h5>
                <div className="input-group mb-3">
                <input 
                    type="text" 
                    className="form-control" 
                    value={referralLink} 
                    readOnly 
                />
                <CopyToClipboard 
                    text={referralLink}
                    onCopy={() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    }}
                >
                    <button className="btn btn-primary" type="button">
                    {copied ? 'Copied!' : 'Copy'}
                    </button>
                </CopyToClipboard>
                </div>
                <p className="text-muted">
                Share this link with friends. When they sign up and win, you'll earn 5% of their winnings!
                </p>
            </div>
            </div>

            <div className="card">
            <div className="card-body">
                <h5 className="card-title">Invite via WhatsApp</h5>
                <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <button 
                    className="btn btn-primary" 
                    type="button"
                    onClick={handleSendInvite}
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Send Invite'}
                </button>
                </div>
            </div>
            </div>

            {referralData.referredUsers.length > 0 && (
            <div className="card mt-4">
                <div className="card-body">
                <h5 className="card-title">Your Referred Friends</h5>
                <div className="table-responsive">
                    <table className="table">
                    <thead>
                        <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Joined On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referralData.referredUsers.map((user) => (
                        <tr key={user._id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.phoneNumber}</td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </div>
            </div>
            )}
        </div>
        </MemberLayout>
    );
    };

export default Referral;