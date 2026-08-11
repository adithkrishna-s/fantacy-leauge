import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from "../layouts/AdminLayout";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddClub = () => {
    const [formData, setFormData] = useState({
        clubName: '',
        managerFirstName: '',
        managerLastName: '',
        managerEmail: '',
        countryCode: '', // Add countryCode to formData
        managerPhone: '',
        managerShare: '',
        adminShare: '',
        managerPassword: ''
    });

    const [countryCodes, setCountryCodes] = useState([]); // State to store country codes
    const navigate = useNavigate();

    // Fetch country codes from the JSON file
    useEffect(() => {
        const fetchCountryCodes = async () => {
            try {
                const response = await fetch('https://gist.githubusercontent.com/anubhavshrimal/75f6183458db8c453306f93521e93d37/raw/f77e7598a8503f1f70528ae1cbf9f66755698a16/CountryCodes.json');
                const data = await response.json();
                setCountryCodes(data);
            } catch (error) {
                console.error('Error fetching country codes:', error);
            }
        };

        fetchCountryCodes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Special handling for managerPhone field
        if (name === 'managerPhone') {
            // Remove all non-digit characters
            const sanitizedValue = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: sanitizedValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { managerShare, adminShare } = formData;

        // Check if either managerShare or adminShare is negative
        if (managerShare < 0 || adminShare < 0) {
            toast.error("Shares cannot be negative.");
            return;
        }

        // Check if the sum of managerShare and adminShare is greater than or equal to 100
        if (parseFloat(managerShare) + parseFloat(adminShare) > 100) {
            toast.error("Sum of managerShare and adminShare must be less than 100.");
            return;
        }

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userInfo.token}`
                }
            };
            await axios.post('/api/clubs', formData, config);
            toast.success('Club added successfully!');
            navigate('/admin-dashboard');
        } catch (error) {
            console.error('Error adding club:', error);
            toast.error('Failed to add club. Please try again.');
        }
    };

    return (
        <AdminLayout>
            <h2>Add Club</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Club Name</label>
                    <input type="text" name="clubName" className="form-control" onChange={handleChange} required />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <label className="form-label">Manager First Name</label>
                        <input type="text" name="managerFirstName" className="form-control" onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Manager Last Name</label>
                        <input type="text" name="managerLastName" className="form-control" onChange={handleChange} required />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label">Manager Email</label>
                    <input type="email" name="managerEmail" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label className="form-label">Manager Password</label>
                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="managerPassword"
                            className="form-control"
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                        </button>
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label">Country Code</label>
                    <select name="countryCode" className="form-control" onChange={handleChange} required>
                        <option value="">Select Country Code</option>
                        {countryCodes.map((country, index) => (
                            <option key={index} value={country.dial_code}>
                                {`${country.dial_code} (${country.name})`}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                    <label className="form-label">Manager Phone Number (Whatsapp)</label>
                    <input 
                        type="tel" 
                        name="managerPhone" 
                        className="form-control" 
                        value={formData.managerPhone} 
                        onChange={handleChange} 
                        required 
                    />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <label className="form-label">Manager Share (%)</label>
                        <input type="number" name="managerShare" className="form-control" onChange={handleChange} step="0.01" required />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Admin Share (%)</label>
                        <input type="number" name="adminShare" className="form-control" onChange={handleChange} step="0.01" required />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary mt-3">Submit</button>
            </form>
            <ToastContainer />
        </AdminLayout>
    );
};

export default AddClub;