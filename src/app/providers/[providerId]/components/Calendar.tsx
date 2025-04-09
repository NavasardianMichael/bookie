'use client'

import React from 'react';
import type { BadgeProps, CalendarProps } from 'antd';
import { Badge, Calendar, Select, Button, Flex } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const getListData = (value: Dayjs) => {
    let listData: { type: string; content: string }[] = []; // Specify the type of listData
    // switch (value.date()) {
    //     case 8:
    //         listData = [
    //             { type: 'warning', content: 'This is warning event.' },
    //             { type: 'success', content: 'This is usual event.' },
    //         ];
    //         break;
    //     case 10:
    //         listData = [
    //             { type: 'warning', content: 'This is warning event.' },
    //             { type: 'success', content: 'This is usual event.' },
    //             { type: 'error', content: 'This is error event.' },
    //         ];
    //         break;
    //     case 15:
    //         listData = [
    //             { type: 'warning', content: 'This is warning event' },
    //             { type: 'success', content: 'This is very long usual event......' },
    //             { type: 'error', content: 'This is error event 1.' },
    //             { type: 'error', content: 'This is error event 2.' },
    //             { type: 'error', content: 'This is error event 3.' },
    //             { type: 'error', content: 'This is error event 4.' },
    //         ];
    //         break;
    //     default:
    // }
    return listData || [];
};

const getMonthData = (value: Dayjs) => {
    if (value.month() === 8) {
        return 1394;
    }
};

const ProviderCalendar: React.FC = () => {
    const monthCellRender = (value: Dayjs) => {
        const num = getMonthData(value);
        return num ? (
            <div className="notes-month">
                <section>{num}</section>
                <span>Backlog number</span>
            </div>
        ) : null;
    };

    const dateCellRender = (value: Dayjs) => {
        const listData = getListData(value);
        return (
            <ul className="events">
                {listData.map((item) => (
                    <li key={item.content}>
                        <Badge status={item.type as BadgeProps['status']} text={item.content} />
                    </li>
                ))}
            </ul>
        );
    };

    const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
        if (info.type === 'date') return dateCellRender(current);
        if (info.type === 'month') return monthCellRender(current);
        return info.originNode;
    };

    // Disable all dates before today
    const disabledDate = (current: Dayjs) => {
        return current && current < dayjs().startOf('day');
    };

    // Custom header render function
    const headerRender = ({ value, onChange }: { value: Dayjs; onChange: (date: Dayjs) => void }) => {
        const currentYear = dayjs().year();
        const currentMonth = dayjs().month();

        // Generate month options (only future months)
        const monthOptions = Array.from({ length: 12 }, (_, i) => {
            const month = dayjs().month(i);
            return {
                value: i,
                label: month.format('MMMM'),
                disabled: value.year() === currentYear && i < currentMonth
            };
        });

        // Handle previous month navigation
        const handlePrevMonth = () => {
            const newDate = value.subtract(1, 'month');
            // Don't allow navigating to past months in current year
            if (newDate.year() < currentYear ||
                (newDate.year() === currentYear && newDate.month() < currentMonth)) {
                return;
            }
            onChange(newDate);
        };

        // Handle next month navigation
        const handleNextMonth = () => {
            const newDate = value.add(1, 'month');
            // Don't allow navigating beyond next year
            if (newDate.year() > currentYear + 1) {
                return;
            }
            onChange(newDate);
        };

        return (
            <div className="p-2 flex justify-between items-center">
                <Button
                    icon={<LeftOutlined />}
                    onClick={handlePrevMonth}
                    disabled={value.year() === currentYear && value.month() === currentMonth}
                />
                <Flex gap={2} align="center">
                    <span className="font-bold">{value.year()}</span>
                </Flex>
                <Flex gap={10} >
                    <Select
                        value={value.month()}
                        onChange={(month) => onChange(value.month(month))}
                        options={monthOptions}
                        className="w-32"
                    />
                    <Button
                        icon={<RightOutlined />}
                        onClick={handleNextMonth}
                        disabled={value.year() === currentYear + 1 && value.month() === 11}
                    />
                </Flex>
            </div>
        );
    };

    return (
        <Calendar
            cellRender={cellRender}
            disabledDate={disabledDate}
            headerRender={headerRender}
        />
    );
};

export default ProviderCalendar;