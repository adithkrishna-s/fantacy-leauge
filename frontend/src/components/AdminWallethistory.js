import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "../layouts/AdminLayout";

const AdminWalletHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.get(`/api/transactions/${userInfo._id}`, config);
      setTransactions(data.reverse()); // Sort by most recent transaction
      setLoading(false);
    } catch (error) {
      // toast.error(error.response?.data?.message || "Failed to load transactions");
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="dashboard-content">
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Wallet History</h5>
            {loading ? (
              <p>Loading transactions...</p>
            ) : transactions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped WallethistoryTable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {/* <th>Transaction ID</th> */}
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn._id}>
                        <td>{new Date(txn.createdAt).toLocaleString()}</td>
                        {/* <td>{txn._id}</td> */}
                        <td className={txn.type === "Credit" ? "text-success" : "text-danger"}>{txn.type}</td>
                        <td className={txn.type === "Credit" ? "text-success" : "text-danger"}>
                          {txn.type === "Credit" ? "+" : "-"}RS{txn.amount.toFixed(2)}
                        </td>
                        <td>{txn.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No transactions found.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWalletHistory;
