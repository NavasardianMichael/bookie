'use client'

import React, { useState } from 'react';
import type { BadgeProps, CalendarProps } from 'antd';
import { Badge, Calendar, Select, Button, Flex, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const getListData = (value: Dayjs) => {
    console.log({ value });

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

// Generate time slots for the day view
const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
        slots.push(dayjs().hour(hour).minute(0));
        slots.push(dayjs().hour(hour).minute(30));
    }
    return slots;
};

const ProviderCalendar: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);
    const timeSlots = generateTimeSlots();

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
        if (info.type === 'date') {
            return (
                <div
                    onClick={() => {
                        setSelectedDate(current);
                        setIsDayViewOpen(true);
                    }}
                    className="cursor-pointer"
                >
                    {dateCellRender(current)}
                </div>
            );
        }
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
                <Flex gap={10} >
                    <Flex gap={2} align="center">
                        <span className="font-bold">{value.year()}</span>
                    </Flex>
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

    // Handle booking a time slot
    const handleBookTimeSlot = (time: Dayjs) => {
        console.log('Booking time slot:', selectedDate?.format('YYYY-MM-DD'), time.format('HH:mm'));
        // Here you would implement the booking logic
        // For now, we'll just close the modal
        setIsDayViewOpen(false);
    };

    return (
        <>
            <Calendar
                cellRender={cellRender}
                disabledDate={disabledDate}
                headerRender={headerRender}
            />

            <Modal
                title={selectedDate ? `Schedule for ${selectedDate.format('MMMM D, YYYY')}` : 'Daily Schedule'}
                open={isDayViewOpen}
                onCancel={() => setIsDayViewOpen(false)}
                footer={null}
                width={600}
            >
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                        {timeSlots.map((time, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleBookTimeSlot(time)}
                            >
                                <span className="font-medium">{time.format('h:mm A')}</span>
                                <Button type="primary" size="small">
                                    Book
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ProviderCalendar;