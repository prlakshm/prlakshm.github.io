import "./projects.css";

// Function to convert hex to RGBA with 30% transparency
function hexToRGBA(hex : string, alpha : number) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProjectCard(props: {
  name: string;
  color: string;
  skills: string[];
  logline: string;
  image: string;
  alphaColor: number;
}) {

  // Convert hex color to RGBA with 30% transparency -- #f8dee6 other pink option
  const rgbaColor = hexToRGBA(props.color, props.alphaColor);

  return <div className="card" style={{backgroundColor: props.color}}>
    <div className="preview-image">
        <img src={props.image} alt="Image of web project on device"/>
        </div>
    <div className="info">
        <div className="all-skills">{props.skills.map(
              (
                skill,
                index 
              ) => (
                <div className="skill" style={{backgroundColor: rgbaColor}} key={index}><h5>{skill}</h5></div>
              )
            )}</div>
        <h3>{props.name}</h3>
        <h4>{props.logline}</h4>
    </div>

  </div>;
}
