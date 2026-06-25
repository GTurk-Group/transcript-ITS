import type { CSSProperties } from "react";

const th: CSSProperties = {
  border: "0.5px solid #000",
  padding: "2px 4px",
  fontSize: "8px",
  fontWeight: 700,
  textAlign: "left",
  background: "#e8e8e8",
};

const td: CSSProperties = {
  border: "0.5px solid #000",
  padding: "2px 4px",
  fontSize: "8px",
  verticalAlign: "top",
};

const BACHELOR_GRADES: [string, string, string, string][] = [
  ["A", "80-100", "4.0", "Excellent"],
  ["B+", "75-79", "3.5", "Very Good"],
  ["B", "70-74", "3.0", "Good"],
  ["C+", "65-69", "2.5", "Very Fair"],
  ["C", "60-64", "2.0", "Fair"],
  ["D+", "55-59", "1.5", "Satisfactory"],
  ["D", "50-54", "1.0", "Barely Satisfactory"],
  ["E", "0-49", "0", "Fail"],
];

const BACHELOR_CLASSES: [string, string][] = [
  ["3.5-4.00", "First Class"],
  ["3.00-3.49", "Second Class Upper"],
  ["2.50-2.99", "Second Class Lower"],
  ["2.00-2.49", "Third Class"],
  ["1.00-1.99", "Pass"],
  ["0.00-0.99", "Fail"],
];

function GradeTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
      <thead>
        <tr>
          <th style={th}>Grade</th>
          <th style={th}>Score</th>
          <th style={th}>Grade Point</th>
          <th style={th}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([grade, score, point, remark]) => (
          <tr key={grade}>
            <td style={td}>{grade}</td>
            <td style={td}>{score}</td>
            <td style={td}>{point}</td>
            <td style={td}>{remark}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClassTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
      <thead>
        <tr>
          <th style={th}>Cumulative Grade Point Average</th>
          <th style={th}>Class</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([cgpa, cls]) => (
          <tr key={cgpa}>
            <td style={td}>{cgpa}</td>
            <td style={td}>{cls}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function GradingSchemePage() {
  const sectionTitle: CSSProperties = {
    fontSize: "9px",
    fontWeight: 700,
    margin: "10px 0 4px",
    textTransform: "uppercase",
  };

  return (
    <div
      className="grading-scheme-page"
      style={{
        pageBreakBefore: "always",
        padding: "16px 14px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 700,
          marginBottom: "12px",
          letterSpacing: "0.5px",
        }}
      >
        GRADING SCHEME
      </div>

      <div style={sectionTitle}>Bachelor of Education Degree</div>
      <GradeTable rows={BACHELOR_GRADES} />
      <ClassTable rows={BACHELOR_CLASSES} />

      <div style={sectionTitle}>Diploma Programmes</div>
      <GradeTable rows={BACHELOR_GRADES} />
      <ClassTable
        rows={[
          ["3.50-4.00", "Distinction"],
          ["2.50-3.49", "Credit"],
          ["1.00-2.49", "Pass"],
          ["Less than 1.00", "Fail"],
        ]}
      />

      <div style={sectionTitle}>Certificate in Education</div>
      <GradeTable rows={BACHELOR_GRADES} />
      <ClassTable
        rows={[
          ["3.50-4.00", "Distinction"],
          ["2.50-3.49", "Credit"],
          ["1.00-2.49", "Pass"],
          ["Less than 1.00", "Fail"],
        ]}
      />
    </div>
  );
}
