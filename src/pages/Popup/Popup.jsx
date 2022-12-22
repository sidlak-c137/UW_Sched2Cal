import React from 'react';
import { useState, useEffect } from 'react';
import { createEvents } from 'ics';
import './Popup.css';

const Popup = () => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currData, setCurrData] = useState(null);
  const [nextData, setNextData] = useState(null);

  useEffect(() => {
      const getData = async (data, data1) => {
          setCurrData(data);
          setNextData(data1);
          console.log(data);
          console.log(data1);
          setLoading(false);
      };
      getCourseData(getData);
  }, []);

  const createFetch = async (path) => {
    const url = "https://my.uw.edu/api/v1" + path;
    const data = await fetch(url, {
      "headers": {
          "accept": "application/json",
          "accept-language": "en-US,en;q=0.9",
          "pragma": "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
      },
      "referrer": "https://my.uw.edu/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    });
    if (!data.ok) {
      return null;
    }
    const body = await data.json();
    return body;
  }

  const fetchData = async (path) => {
    var data = await createFetch(path);
    if (data?.terms?.length >= 1) {
      data = await createFetch('/visual_schedule/' + data.terms[0].label);
    } else if (data?.term) {
      data = await createFetch('/visual_schedule/' + data.term.label);
    } else {
      return null;
    }
    if (data?.periods) {
      return data;
    }
    return null;
  }

  const toTitleCase = (str) => {
    return str.split(' ')
    .map(w => w[0].toUpperCase() + w.substring(1).toLowerCase())
    .join(' ');
  }

  const parseDays = (obj, start, end) => {
    var ret = [];
    var valid = [false, false, false, false, false, false, false];
    for (const day in obj) {
      switch (day) {
        case "monday":
          obj[day] && ret.push("MO") && ((valid[1] = true) == true);
          break;
        case "tuesday":
          obj[day] && ret.push("TU") && ((valid[2] = true) == true);
          break;
        case "wednesday":
          obj[day] && ret.push("WE") && ((valid[3] = true) == true);
          break;
        case "thursday":
          obj[day] && ret.push("TH") && ((valid[4] = true) == true);
          break;
        case "friday":
          obj[day] && ret.push("FR") && ((valid[5] = true) == true);
          break;
        case "saturday":
          obj[day] && ret.push("SA") && ((valid[6] = true) == true);
          break;
        case "sunday":
          obj[day] && ret.push("SU") && ((valid[0] = true) == true);
          break;
        default:
          ret.push("ERROR");
          break;
      }
    }
    var day = start.getDay();
    var inc = 0;
    while (!valid[(day + inc) % 7]) {
      inc++;
    }
    start.setDate(start.getDate() + inc);
    end.setDate(end.getDate() + inc);
    return ret.toString();
  }

  const parseData = (data) => {
    console.log(data);
    var retData = [];
    var classes = [];
    var finals = [];
    var names = [];
    for (var i  = 0; i < data.periods[0].sections.length; i++) {
      classes.push(false);
      finals.push(false);
      names.push("");
    }
    for (var i = 0; i < 2; i++) {
      for (var j  = 0; j < data.periods[i].sections.length; j++) {
        var section = data.periods[i].sections[j];
        var title = section.curriculum_abbr + ' ' + section.course_number + ' ' + section.section_id;
        if (section.meetings[0].no_meeting) {
          continue;
        }
        classes[j] = true;
        var start = new Date(data.periods[i].start_date + 'T' + section.meetings[0].start_time + ':00');
        var end = new Date(data.periods[i].start_date + 'T' + section.meetings[0].end_time + ':00');
        var last = new Date(data.periods[i].end_date + 'T23:59:00');
        var description = toTitleCase(section.course_title);
        var location = section.meetings[0].building + ' ' + section.meetings[0].room_number;
        var lat = section.meetings[0].latitude;
        var lon = section.meetings[0].longitude;
        var rr = 'FREQ=WEEKLY;BYDAY=' + parseDays(section.meetings[0].meeting_days, start, end) + ';INTERVAL=1;UNTIL=' + last.toISOString().replaceAll('-', '').replaceAll(':', '').split('.')[0];
        var event = {
          title: title,
          start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
          startOutputType: "local",
          end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
          description: description,
          location: location,
          geo: {lat: parseFloat(lat), lon: parseFloat(lon)},
          status: 'CONFIRMED',
          recurrenceRule: rr,
        }
        retData.push(event);
      }
    }
    // Handle finals
    for (var j  = 0; j < data.periods[2].sections.length; j++) {
      var section = data.periods[2].sections[j];
      var title = section.curriculum_abbr + ' ' + section.course_number + ' ' + section.section_id;
      var final = section.final_exam;
      names[j] = title;
      if (!final.building || final.no_exam_or_nontraditional) {
        continue;
      }
      finals[j] = true;
      var start = new Date(final.start_date);
      var end = new Date(final.end_date);
      var description = toTitleCase(section.course_title) + ' (Final Exam)';
      var location = final.building + ' ' + final.room_number;
      var lat = final.latitude;
      var lon = final.longitude;
      var event = {
        title: title,
        start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
        startOutputType: "local",
        end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
        description: description,
        location: location,
        geo: {lat: parseFloat(lat), lon: parseFloat(lon)},
        status: 'CONFIRMED',
      }
      retData.push(event);
    }
    return [retData, classes, finals, names];
  }

  const getCourseData = async (callback) => {
    // Get and parse raw data
    var data = await fetchData('/schedule/current');
    if (data) {
      const [a, b, c, d] = parseData(data);
      data = {
        name: toTitleCase(data.term.quarter) + ' ' + data.term.year,
        file: data.term.quarter + data.term.year,
        data: a,
        classes: b,
        finals: c,
        names: d,
      };
    } else {
      data = {};
    }
    var data1 = await fetchData('/oquarters');
    if (data1) {
      const [a, b, c, d] = parseData(data1);
      data1 = {
        name: toTitleCase(data1.term.quarter) + ' ' + data1.term.year,
        file: data1.term.quarter + data1.term.year,
        data: a,
        classes: b,
        finals: c,
        names: d,
      };
    } else {
      data1 = {};
    }
    callback(data, data1);
    return;
  }

  const download = (e, data) => {
    e.preventDefault();
    setDownloading(true);
    createEvents(data.data, (error, value) => {
        if (error) {
          console.log(error)
          return
        }
      var file = new File([value], data.file + ".ics", {type: "text/plain"});
      var url = URL.createObjectURL(file);
      chrome.runtime.sendMessage({url: url, name: data.file}, function(response) {
        console.log(response);
        setDownloading(false);
      });
    });
  }

  const getTime = (date) => {
    return date[3] + ":" + date[4];
  }

  const getRepeating = (str) => {
    var days = str.split('=')[2].split(';')[0];
    var days = days.replace("MO", "M");
    var days = days.replace("TU", "T");
    var days = days.replace("WE", "W");
    var days = days.replace("TH", "Th");
    var days = days.replace("FR", "F");
    var days = days.replaceAll(",", "");
    return days;
  }

  const renderRow = (data, i) => {
    if (!data.classes[i]) {
      return (
        <tr key={data.names[i]}>
          <td>{data.names[i]}</td>
          <td>--</td>
          <td>--</td>
          <td>--</td>
        </tr>
      );
    }
    var count = 0;
    for (var j = 0; j < i; j++) {
      if (!data.classes[j]) {
        count++;
      }
    }
    var render = (
      <tr key={data.names[i]}>
        <td>{data.names[i]}</td>
        <td>{getTime(data.data[i + count].start) + "-" + getTime(data.data[i + count].end)}</td>
        <td>{getRepeating(data.data[i + count].recurrenceRule)}</td>
        <td>{data.finals[i] ? "Yes" : "No"}</td>
      </tr>
    )
    return render;
  }

  const renderTable = (data) => {
    const render = (
      <table className="styled-table">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Repeating</th>
                  <th>Final?</th>
              </tr>
          </thead>
          <tbody>
            {data.classes.map((_, i) => (
              renderRow(data, i)
            ))}
          </tbody>
      </table>
    )
    return render;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h2 style={{margin: "0"}} >UW Sched2Cal</h2>
        {
          loading && <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        }
        {
          !loading && currData?.name && (
            <div style={{border: "3px solid #009879", padding: "15px", borderRadius: "20px", marginTop: "20px"}}>
              <h4 style={{margin: "0"}}>{currData.name}</h4>
              { renderTable(currData) }
              <button className={"download-button"} disabled={loading || downloading} onClick={(e) => {download(e, currData);}}>
                <a>Download {currData.name} as ics</a>
              </button>
            </div>
          )
        }
        {
          !loading && nextData?.name && (
            <div style={{border: "3px solid #009879", padding: "15px", borderRadius: "20px", marginTop: "20px"}}>
              <h4 style={{margin: "0"}}>{nextData.name}</h4>
              { renderTable(nextData) }
              <button className={"download-button"} disabled={loading || downloading} onClick={(e) => {download(e, nextData);}}>
                <a>Download {nextData.name} as ics</a>
              </button>
            </div>
          )
        }
      </header>
    </div>
  );
};

export default Popup;
