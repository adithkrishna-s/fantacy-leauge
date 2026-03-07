import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const ManageMembers = () => {
  const [members, setMembers] = useState([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [modalType, setModalType] = useState(''); // 'add' or 'deduct'
  const [isProcessing, setIsProcessing] = useState(false); // Loading state for credit operations

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const response = await axios.get('https://fantasyleague7.com/api/users/members', config);
      setMembers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch members');
    }
  };

  const handleAddCredit = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    if (!creditAmount || isNaN(creditAmount) || creditAmount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setIsProcessing(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      await axios.put(
        `https://fantasyleague7.com/api/users/add-credit/${selectedMemberId}`,
        { creditAmount: parseFloat(creditAmount) },
        config
      );

      toast.success('Credit added successfully');
      fetchMembers(); // Refresh the list
      setCreditAmount('');
      setShowModal(false); // Close the modal
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add credit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeductCredit = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    if (!creditAmount || isNaN(creditAmount) || creditAmount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setIsProcessing(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      // Fetch the member's current credit balance
      const member = members.find((m) => m._id === selectedMemberId);
      if (!member) {
        toast.error('Member not found');
        return;
      }

      if (member.credits < creditAmount) {
        toast.error('Deduction amount cannot exceed the member\'s credit balance');
        return;
      }

      await axios.put(
        `https://fantasyleague7.com/api/users/deduct-credit/${selectedMemberId}`,
        { creditAmount: parseFloat(creditAmount) },
        config
      );

      toast.success('Credit deducted successfully');
      fetchMembers(); // Refresh the list
      setCreditAmount('');
      setShowModal(false); // Close the modal
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deduct credit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        await axios.put(`https://fantasyleague7.com/api/users/remove-member/${memberId}`, {}, config);
        toast.success('Member removed successfully');
        fetchMembers(); // Refresh the list
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  const openModal = (memberId, type) => {
    setSelectedMemberId(memberId);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    if (!isProcessing) { // Only allow closing if not processing
      setShowModal(false);
      setCreditAmount('');
    }
  };

  return (
    <ManagerLayout>
      <ToastContainer />
      <h2 className="text-center">Manage Members</h2>
      <div className="AddMatchLink my-3">
        <Link to="/manager-dashboard/add-members" className="btn btn-primary mb-3">
          Add Member
        </Link>
      </div>

      <div className='Resultcards'>
        {members.map((member) => (
          <div className="card my-3 mx-2 py-3 Resultcard" key={member._id}>
            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{`${member.firstName} ${member.lastName}`}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Name</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{member.phoneNumber}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Phone</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{member.credits}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Credit Balance</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="MachesActions">
                <button
                    className="btn btn-success btn-sm"
                    onClick={() => openModal(member._id, 'add')}
                  >
                    Add Credit
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => openModal(member._id, 'deduct')}
                  >
                    Deduct Credit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveMember(member._id)}
                  >
                    Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      

      {/* Add/Deduct Credit Modal */}
      <div className={`modal fade ${showModal ? 'show' : ''}`} style={{ display: showModal ? 'block' : 'none' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {modalType === 'add' ? 'Add Credit' : 'Deduct Credit'}
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={closeModal}
                disabled={isProcessing}
              ></button>
            </div>
            <div className="modal-body">
              <input
                type="number"
                placeholder="Credit Amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="form-control"
                disabled={isProcessing}
              />
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={closeModal}
                disabled={isProcessing}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={modalType === 'add' ? handleAddCredit : handleDeductCredit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {modalType === 'add' ? 'Adding...' : 'Deducting...'}
                  </>
                ) : (
                  modalType === 'add' ? 'Add Credit' : 'Deduct Credit'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showModal && <div className="modal-backdrop fade show"></div>}
    </ManagerLayout>
  );
};

export default ManageMembers;