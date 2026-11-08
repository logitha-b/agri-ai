const fs = require('fs');
let code = fs.readFileSync('c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx', 'utf8');

const oldImport = "import { AlertTriangle, BarChart2, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, IndianRupee, Leaf, Sparkles, ShieldAlert, TreeDeciduous,";
const newImport = "import { AlertTriangle, BarChart2, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, IndianRupee, Leaf, Sparkles, ShieldAlert, TreeDeciduous,";

if (code.includes(oldImport)) {
  code = code.replace(oldImport, newImport);
  fs.writeFileSync('c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx', code, 'utf8');
  console.log('Successfully added BookOpen import to ModuleResultRenderer.jsx!');
} else {
  console.error('oldImport not found!');
}

