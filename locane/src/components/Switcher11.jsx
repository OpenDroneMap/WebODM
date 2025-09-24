import React, { useState } from 'react';
import './switcher11.css'; // Import the new CSS file

const Switcher11 = ({isChecked,setIsChecked}) => {


    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
    };

    return (
        <>
            <label className='themeSwitcher'>
                <input
                    type='checkbox'
                    className='themeSwitcher-checkbox'
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                />
                {/* Light Mode Button */}
                <span
                    className={`switcher-button ${!isChecked ? 'active' : ''}`}
                >

          2D
        </span>
                {/* Dark Mode Button */}
                <span
                    className={`switcher-button ${isChecked ? 'active' : ''}`}
                >

          3D
        </span>
            </label>
        </>
    );
};

export default Switcher11;