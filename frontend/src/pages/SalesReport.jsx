import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const months = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]

const SalesReport = () => {

  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [books, setBooks] = useState([]);
  const [visibleBooks, setVisibleBooks] = useState([...books]);
  const [salesData, setSalesData] = useState({});

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await axios.get('/api/api/sales/years');
        setYears(res.data);
        setSelectedYear(res.data[0]); // Set most recent year as default
      } catch (err) {
        console.error('Failed to load years:', err);
      }
    };

    fetchYears();
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const res = await axios.get(`/api/api/sales/${selectedYear}`);
        const rawData = res.data;

        const bookNames = Object.keys(rawData);
        setBooks(bookNames);

        const formatted = months.map((month, index) => {
          const data = { month }; // e.g., { month: 'January' }

          bookNames.forEach(book => {
            // Safely access month data (index 0-based for Jan → index 0)
            const monthData = rawData[book][index];

            data[book] = {
              unit_price: parseFloat(monthData.unit_price),
              units_sold: monthData.units_sold,
              total: parseFloat(monthData.total),
            };
          });
          return data;
        });

        setSalesData(prev => ({
          ...prev,
          [selectedYear]: formatted
        }));
      } catch (err) {
        console.error('Failed to fetch sales data:', err);
      }
    };

    fetchSalesData();
  }, [selectedYear]);

  useEffect(() => {
    setVisibleBooks(books);
  }, [books]);

  const handleBookToggle = (book) => {
    setVisibleBooks(prev =>
      prev.includes(book)
        ? prev.filter(b => b !== book)
        : [...prev, book]
    );
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = [];

    books.forEach(book => {
      const row = { 'Book Name': book };
      salesData[selectedYear].forEach((monthData, i) => {
        const m = monthNames[i];
        const d = monthData[book];
        row[`${m} Price`] = d.unit_price;
        row[`${m} Units`] = d.units_sold;
        row[`${m} Total`] = d.total;
      });
      data.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, String(selectedYear));
    XLSX.writeFile(wb, `Sales_Report_${selectedYear}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const rows = [];
    months.forEach((month, i) => {
      ['Price', 'Units', 'Total'].forEach(type => {
        const row = [`${monthNames[i]} ${type}`];
        books.forEach(book => {
          const data = salesData[selectedYear][i][book];
          if (type === 'Price') row.push(`RM${data.unit_price}`);
          if (type === 'Units') row.push(data.units_sold);
          if (type === 'Total') row.push(`RM${data.total.toLocaleString()}`);
        });
        rows.push(row);
      });
    });

    const headers = ['Month Detail', ...books];

    doc.text(`Sales Report - ${selectedYear}`, 14, 16);

    autoTable(doc, {
      startY: 20,
      head: [headers],
      body: rows,
      styles: { fontSize: 8 }
    });

    doc.save(`Sales_Report_${selectedYear}.pdf`);
  };

  const contentStyle = {
    marginTop: '60px',
    width: '87%',
    marginLeft: '0',
    transition: 'margin 0.3s ease',
    padding: '20px',
  };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];


  return (
    <div className="container mt-5" style={contentStyle}>
      <h2 className='fw-bold'>Sales Report</h2>

      <div className="row mb-0">
        <div className="col-md-6 offset-md-6">
          <div className="d-flex align-items-center justify-content-end">
            <label className="me-2">Select Year:</label>
            <select
              className="form-select w-auto"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-3 d-flex gap-2">
        <button className="btn btn-outline-success" onClick={exportToExcel}>
          Export to Excel
        </button>
        <button className="btn btn-outline-danger" onClick={exportToPDF}>
          Export to PDF
        </button>
      </div>

      {/* Sales Table */}
      <div className="table-responsive rounded-4">
        <table className="table rounded-4 table-bordered text-center align-middle" style={{ fontSize: '.7rem' }}>
          <thead className="table-dark">
            <tr>
              <th>Product Name</th>
              {months.map(month => {
                const monthName = monthNames[month - 1];
                return (
                  <th key={month} colSpan={3}>{monthName}</th>
                );
              })}
            </tr>
            <tr>
              <th></th>
              {months.map(month => (
                <>
                  <th key={`${month}-price`}>Price</th>
                  <th key={`${month}-units`}>Units Sold</th>
                  <th key={`${month}-total`}>Total</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {books.map(book => (
              <tr key={book}>
                <td className="fw-bold">{book}</td>
                {salesData[selectedYear]?.map(monthData => {
                  const data = monthData[book] || { unit_price: 0, units_sold: 0, total: 0 };
                  return (
                    <>
                      <td>RM{data.unit_price.toLocaleString()}</td>
                      <td>{data.units_sold}</td>
                      <td>RM{data.total.toLocaleString()}</td>
                    </>
                  );
                })}
              </tr>
            ))}
            <tr className="table-secondary fw-bold">
              <td>Monthly Total</td>
              {salesData[selectedYear]?.map((monthData = {}, index) => {
                const total = books.reduce((sum, book) => {
                  const bookData = monthData[book];
                  return sum + (parseFloat(bookData?.total) || 0);
                }, 0);

                return (
                  <td colSpan={3} key={index}>RM{total.toLocaleString()}</td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Book Filter */}
      <div className="mb-3 mt-4">
        <label className="form-label fw-bold">Toggle Book Lines:</label>
        <div className="d-flex flex-wrap gap-3">
          {books.map(book => (
            <div className="form-check" key={book}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={visibleBooks.includes(book)}
                onChange={() => handleBookToggle(book)}
                id={`toggle-${book}`}
              />
              <label className="form-check-label" htmlFor={`toggle-${book}`}>
                {book}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <h5 className="mt-4 mb-3">Year {selectedYear}</h5>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={salesData[selectedYear]?.map((m = {}) => {
          const entry = { month: m.month };
          books.forEach(book => {
            entry[book] = parseFloat(m[book]?.total) || 0;
          });
          return entry;
        })}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={value => `RM${(value / 1000).toFixed(0)}k`} />
          <Tooltip formatter={value => `RM${value.toLocaleString()}`} />
          <Legend />
          {visibleBooks.map((book, index) => (
            <Line
              key={book}
              type="monotone"
              dataKey={book}
              stroke={`hsl(${index * 36}, 70%, 50%)`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SalesReport;