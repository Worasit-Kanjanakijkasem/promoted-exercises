/* ชุดโจทย์: รากของสมการกำลังสองเชิงซ้อน  x² + (c+di) = (a+bi)x  ถาม |z₁|² + |z₂|²
   เฉลยใช้กฎสี่เหลี่ยมด้านขนาน: |z₁|²+|z₂|² = ( |z₁+z₂|² + |z₁−z₂|² ) / 2   โดย |z₁−z₂|² = |(z₁+z₂)² − 4z₁z₂|
   ไม่มีระดับความยาก (ระดับเดียว)
   ข้อห้าม: b ≠ 0, d ≠ 0, D = (a+bi)² − 4(c+di) ≠ 0 (รากซ้ำ), และห้ามเป็นข้อสอบจริง (ใน forbidden) */
import { simplifySqrt, texP, rngTools, M } from "../lib/math.js";

const A_MAX = 5, B_MAX = 5, C_MAX = 9, D_MAX = 9;

// จำนวนเชิงซ้อน re + im i เป็น TeX
function cx(re, im) {
  const imPart = im === 0 ? "" : `${Math.abs(im) === 1 ? "" : Math.abs(im)}i`;
  if (im === 0) return `${re}`;
  if (re === 0) return (im < 0 ? "-" : "") + imPart;
  return `${re}${im < 0 ? "-" : "+"}${imPart}`;
}

// คืนข้อมูลทั้งหมดของข้อหนึ่ง ๆ จาก (a,b,c,d) หรือ null ถ้าเข้าข้อห้ามของโครงสร้าง
export function build(a, b, c, d) {
  if (b === 0 || d === 0) return null;
  const re = a * a - b * b - 4 * c, im = 2 * a * b - 4 * d;        // D = (a+bi)² − 4(c+di)
  const N = re * re + im * im;
  if (N === 0) return null;
  const m = a * a + b * b;
  const { s: k, r } = simplifySqrt(N);                              // √N = k√r

  // คำตอบ (m + k√r)/2 แบบอย่างง่าย
  const kr = (kk) => (kk === 1 ? "" : `${kk}`) + `\\sqrt{${r}}`;
  let ansTex, value;
  if (r === 1) {
    const t = m + k; value = t / 2;
    ansTex = t % 2 === 0 ? `${t / 2}` : `\\frac{${t}}{2}`;
  } else {
    value = (m + k * Math.sqrt(r)) / 2;
    ansTex = (m % 2 === 0 && k % 2 === 0) ? `${m / 2}+${kr(k / 2)}` : `\\frac{${m}+${kr(k)}}{2}`;
  }
  const rawFrac = `\\frac{${m}+\\sqrt{${N}}}{2}`;

  const S = cx(a, b), P = cx(c, d), Z = cx(re, im);
  const eqTex = `x^2+\\left(${P}\\right)=\\left(${S}\\right)x`;
  const steps = [
    ["กระจาย ", M("|z_1+z_2|^2=(z_1+z_2)(\\overline{z_1}+\\overline{z_2})=|z_1|^2+z_1\\overline{z_2}+\\overline{z_1}z_2+|z_2|^2")],
    ["กระจาย ", M("|z_1-z_2|^2=(z_1-z_2)(\\overline{z_1}-\\overline{z_2})=|z_1|^2-z_1\\overline{z_2}-\\overline{z_1}z_2+|z_2|^2")],
    ["บวกกันแล้วหารสอง ได้ ", M("|z_1|^2+|z_2|^2=\\frac{|z_1+z_2|^2+|z_1-z_2|^2}{2}")],
    ["ย้ายข้างให้เหมือนสมการจำนวนจริง ", M(`x^2-\\left(${S}\\right)x+\\left(${P}\\right)=0`)],
    ["ผลบวกราก ", M(`z_1+z_2=${S}`), " ผลคูณราก ", M(`z_1z_2=${P}`)],
    ["ดังนั้น ", M(`|z_1+z_2|^2=\\left|${S}\\right|^2=${texP(a)}^2+${texP(b)}^2=${m}`)],
    ["และ ", M(`(z_1-z_2)^2=(z_1+z_2)^2-4z_1z_2=\\left(${S}\\right)^2-4\\left(${P}\\right)=\\left(${cx(a * a - b * b, 2 * a * b)}\\right)-\\left(${cx(4 * c, 4 * d)}\\right)=${Z}`)],
    ["เพราะ ", M("|w^2|=|w|^2"), " จึงได้ ", M(`|z_1-z_2|^2=\\left|(z_1-z_2)^2\\right|=\\left|${Z}\\right|=\\sqrt{${texP(re)}^2+${texP(im)}^2}=\\sqrt{${N}}${k > 1 ? "=" + (r === 1 ? `${k}` : kr(k)) : ""}`)],
  ];
  if (ansTex !== rawFrac) steps.push(["แทนค่าในบรรทัดที่ 3 ได้ ", M(`\\frac{${m}+${r === 1 ? k : kr(k)}}{2}`)]);
  else steps.push(["แทนค่าในบรรทัดที่ 3"]);
  // บรรทัดสุดท้ายซ้ำคำตอบ ไม่จำเป็น: ตัดออกเมื่อไม่มีอะไรเพิ่ม
  if (steps[steps.length - 1].length === 1) steps.pop();

  return { a, b, c, d, re, im, N, m, k, r, value, ansTex, eqTex, steps };
}

export default {
  id: "complex-roots-type-1",
  version: 1,
  weights: [100],
  forbidden: ["4,-1,5,-5"],        // ข้อสอบจริง: x² + 5(1−i) = (4−i)x
  make(level, rnd) {
    const R = rngTools(rnd);
    for (let i = 0; i < 200; i++) {
      const a = R.randInt(-A_MAX, A_MAX), b = R.randSigned([1, B_MAX]);
      const c = R.randInt(-C_MAX, C_MAX), d = R.randSigned([1, D_MAX]);
      const P = build(a, b, c, d);
      if (!P) continue;
      return {
        key: `${a},${b},${c},${d}`,
        problem: {
          rows: [
            { text: ["กำหนดให้ ", { m: "i=\\sqrt{-1}" }, " และ ", { m: "z_1,\\ z_2" }, " เป็นรากทั้งหมดของสมการ"], math: P.eqTex },
            { text: ["จงหาค่าของ"], math: "|z_1|^2+|z_2|^2" },
          ],
        },
        solution: { steps: P.steps, answer: P.ansTex },
      };
    }
    throw new Error("generator failed");
  },
};
