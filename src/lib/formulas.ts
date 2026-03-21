export interface Formula {
  id: string;
  name: string;
  formula: string;
  description: string;
}

export interface FormulaCategory {
  id: string;
  name: string;
  formulas: Formula[];
}

export interface SubjectFormulas {
  subjectId: string;
  categories: FormulaCategory[];
}

export const allFormulas: SubjectFormulas[] = [
  {
    subjectId: "matematica",
    categories: [
      {
        id: "algebra",
        name: "Álgebra",
        formulas: [
          { id: "m1", name: "Equação do 2º grau", formula: "x = (-b ± √(b² - 4ac)) / 2a", description: "Fórmula de Bhaskara para raízes de ax² + bx + c = 0" },
          { id: "m2", name: "Discriminante", formula: "Δ = b² - 4ac", description: "Determina a natureza das raízes" },
          { id: "m3", name: "Produto notável", formula: "(a + b)² = a² + 2ab + b²", description: "Quadrado da soma" },
          { id: "m4", name: "Diferença de quadrados", formula: "a² - b² = (a + b)(a - b)", description: "Fatoração" },
          { id: "m5", name: "Soma de PA", formula: "Sₙ = n(a₁ + aₙ) / 2", description: "Soma dos n termos de uma PA" },
          { id: "m6", name: "Termo geral PA", formula: "aₙ = a₁ + (n-1)r", description: "Enésimo termo de uma PA" },
          { id: "m7", name: "Termo geral PG", formula: "aₙ = a₁ · qⁿ⁻¹", description: "Enésimo termo de uma PG" },
          { id: "m8", name: "Soma de PG finita", formula: "Sₙ = a₁(qⁿ - 1) / (q - 1)", description: "Para q ≠ 1" },
        ],
      },
      {
        id: "geometria",
        name: "Geometria",
        formulas: [
          { id: "m9", name: "Área do triângulo", formula: "A = (b · h) / 2", description: "Base vezes altura dividido por 2" },
          { id: "m10", name: "Teorema de Pitágoras", formula: "a² = b² + c²", description: "Relação entre lados do triângulo retângulo" },
          { id: "m11", name: "Área do círculo", formula: "A = π · r²", description: "Pi vezes raio ao quadrado" },
          { id: "m12", name: "Perímetro do círculo", formula: "P = 2πr", description: "Circunferência" },
          { id: "m13", name: "Volume da esfera", formula: "V = (4/3)πr³", description: "Volume de uma esfera de raio r" },
          { id: "m14", name: "Área do trapézio", formula: "A = (B + b) · h / 2", description: "Soma das bases vezes altura dividido por 2" },
          { id: "m15", name: "Volume do cilindro", formula: "V = πr²h", description: "Área da base vezes altura" },
          { id: "m16", name: "Volume do cone", formula: "V = (1/3)πr²h", description: "Um terço do volume do cilindro" },
        ],
      },
      {
        id: "trigonometria",
        name: "Trigonometria",
        formulas: [
          { id: "m17", name: "Seno", formula: "sen(θ) = cateto oposto / hipotenusa", description: "Razão trigonométrica" },
          { id: "m18", name: "Cosseno", formula: "cos(θ) = cateto adjacente / hipotenusa", description: "Razão trigonométrica" },
          { id: "m19", name: "Tangente", formula: "tan(θ) = sen(θ) / cos(θ)", description: "Razão trigonométrica" },
          { id: "m20", name: "Identidade fundamental", formula: "sen²(θ) + cos²(θ) = 1", description: "Relação fundamental" },
          { id: "m21", name: "Lei dos senos", formula: "a/sen(A) = b/sen(B) = c/sen(C)", description: "Relação entre lados e ângulos" },
          { id: "m22", name: "Lei dos cossenos", formula: "a² = b² + c² - 2bc·cos(A)", description: "Generalização de Pitágoras" },
        ],
      },
      {
        id: "financeira",
        name: "Matemática Financeira",
        formulas: [
          { id: "m23", name: "Juros simples", formula: "J = C · i · t", description: "Capital × taxa × tempo" },
          { id: "m24", name: "Montante simples", formula: "M = C(1 + i·t)", description: "Capital mais juros" },
          { id: "m25", name: "Juros compostos", formula: "M = C(1 + i)ᵗ", description: "Montante com juros compostos" },
          { id: "m26", name: "Porcentagem", formula: "P = (parte / total) × 100", description: "Cálculo de porcentagem" },
          { id: "m27", name: "Regra de três", formula: "a/b = c/x → x = (b·c)/a", description: "Proporcionalidade direta" },
        ],
      },
    ],
  },
  {
    subjectId: "fisica",
    categories: [
      {
        id: "cinematica",
        name: "Cinemática",
        formulas: [
          { id: "f1", name: "Velocidade média", formula: "v = Δs / Δt", description: "Deslocamento sobre tempo" },
          { id: "f2", name: "MRU", formula: "s = s₀ + v·t", description: "Movimento retilíneo uniforme" },
          { id: "f3", name: "MRUV - velocidade", formula: "v = v₀ + a·t", description: "Velocidade no MRUV" },
          { id: "f4", name: "MRUV - posição", formula: "s = s₀ + v₀t + (a·t²)/2", description: "Posição no MRUV" },
          { id: "f5", name: "Equação de Torricelli", formula: "v² = v₀² + 2aΔs", description: "Relação sem o tempo" },
        ],
      },
      {
        id: "dinamica",
        name: "Dinâmica",
        formulas: [
          { id: "f6", name: "2ª Lei de Newton", formula: "F = m · a", description: "Força resultante" },
          { id: "f7", name: "Peso", formula: "P = m · g", description: "Força gravitacional (g ≈ 10 m/s²)" },
          { id: "f8", name: "Atrito", formula: "Fₐ = μ · N", description: "Força de atrito" },
          { id: "f9", name: "Trabalho", formula: "τ = F · d · cos(θ)", description: "Trabalho de uma força" },
          { id: "f10", name: "Energia cinética", formula: "Ec = mv²/2", description: "Energia de movimento" },
          { id: "f11", name: "Energia potencial", formula: "Ep = m·g·h", description: "Energia potencial gravitacional" },
          { id: "f12", name: "Potência", formula: "P = τ / Δt", description: "Trabalho por tempo" },
        ],
      },
      {
        id: "eletricidade",
        name: "Eletricidade",
        formulas: [
          { id: "f13", name: "Lei de Ohm", formula: "V = R · i", description: "Tensão = Resistência × Corrente" },
          { id: "f14", name: "Potência elétrica", formula: "P = V · i", description: "Potência dissipada" },
          { id: "f15", name: "Lei de Coulomb", formula: "F = k·|q₁·q₂|/d²", description: "Força elétrica entre cargas" },
          { id: "f16", name: "Resistores em série", formula: "Req = R₁ + R₂ + ... + Rₙ", description: "Soma direta" },
          { id: "f17", name: "Resistores em paralelo", formula: "1/Req = 1/R₁ + 1/R₂ + ...", description: "Soma dos inversos" },
        ],
      },
      {
        id: "termodinamica",
        name: "Termodinâmica",
        formulas: [
          { id: "f18", name: "Calor sensível", formula: "Q = m·c·ΔT", description: "Calor para variar temperatura" },
          { id: "f19", name: "Calor latente", formula: "Q = m·L", description: "Calor para mudança de fase" },
          { id: "f20", name: "Dilatação linear", formula: "ΔL = L₀·α·ΔT", description: "Variação de comprimento" },
          { id: "f21", name: "Gás ideal", formula: "PV = nRT", description: "Equação do gás ideal" },
        ],
      },
      {
        id: "optica",
        name: "Óptica",
        formulas: [
          { id: "f22", name: "Lei de Snell", formula: "n₁·sen(θ₁) = n₂·sen(θ₂)", description: "Refração da luz" },
          { id: "f23", name: "Espelhos/Lentes", formula: "1/f = 1/p + 1/p'", description: "Equação de Gauss" },
          { id: "f24", name: "Aumento linear", formula: "A = -p'/p", description: "Ampliação da imagem" },
        ],
      },
    ],
  },
  {
    subjectId: "quimica",
    categories: [
      {
        id: "geral",
        name: "Química Geral",
        formulas: [
          { id: "q1", name: "Massa molar", formula: "n = m / M", description: "Número de mols = massa / massa molar" },
          { id: "q2", name: "Volume molar (CNTP)", formula: "V = n × 22,4 L", description: "Volume de 1 mol de gás a 0°C e 1 atm" },
          { id: "q3", name: "Número de Avogadro", formula: "N = n × 6,022 × 10²³", description: "Quantidade de partículas" },
          { id: "q4", name: "Densidade", formula: "d = m / V", description: "Massa sobre volume" },
        ],
      },
      {
        id: "solucoes",
        name: "Soluções",
        formulas: [
          { id: "q5", name: "Concentração comum", formula: "C = m₁ / V", description: "Massa de soluto / volume da solução (g/L)" },
          { id: "q6", name: "Molaridade", formula: "M = n / V", description: "Mols de soluto / volume em litros" },
          { id: "q7", name: "Diluição", formula: "C₁V₁ = C₂V₂", description: "Relação de diluição" },
          { id: "q8", name: "Título", formula: "τ = m₁ / (m₁ + m₂)", description: "Massa de soluto / massa total" },
        ],
      },
      {
        id: "termoquimica",
        name: "Termoquímica",
        formulas: [
          { id: "q9", name: "Lei de Hess", formula: "ΔH = Σ ΔHf(produtos) - Σ ΔHf(reagentes)", description: "Variação de entalpia" },
          { id: "q10", name: "Energia de ligação", formula: "ΔH = Σ Eligações rompidas - Σ Eligações formadas", description: "Cálculo pela energia de ligação" },
        ],
      },
      {
        id: "eletroquimica",
        name: "Eletroquímica",
        formulas: [
          { id: "q11", name: "DDP da pilha", formula: "ΔE = E°(cátodo) - E°(ânodo)", description: "Diferença de potencial" },
          { id: "q12", name: "Equação de Nernst", formula: "E = E° - (RT/nF)·ln(Q)", description: "Potencial fora do padrão" },
        ],
      },
      {
        id: "equilibrio",
        name: "Equilíbrio Químico",
        formulas: [
          { id: "q13", name: "Constante de equilíbrio", formula: "Kc = [C]ᶜ[D]ᵈ / [A]ᵃ[B]ᵇ", description: "Para aA + bB ⇌ cC + dD" },
          { id: "q14", name: "pH", formula: "pH = -log[H⁺]", description: "Potencial hidrogeniônico" },
          { id: "q15", name: "pOH", formula: "pOH = -log[OH⁻]", description: "Potencial hidroxiliônico" },
          { id: "q16", name: "Relação pH + pOH", formula: "pH + pOH = 14", description: "A 25°C" },
        ],
      },
    ],
  },
];
