'use client'

import { FC } from 'react'
import { Select, SelectProps } from 'antd'

const viewOptions: SelectProps['options'] = [
    { value: 'dayGridMonth', label: 'Month' },
    { value: 'timeGridWeek', label: 'Week' },
    { value: 'timeGridDay', label: 'Day' },
    { value: 'listWeek', label: 'List' },
]


const ViewsDropdown: FC = () => {
    const handleChange: SelectProps['onChange'] = (value) => {
        console.log(`selected ${value}`);
    };

    return (
        <Select
            defaultValue="lucy"
            style={{ width: 120 }}
            onChange={handleChange}
            options={viewOptions}
        />
    )
}

export default ViewsDropdown
