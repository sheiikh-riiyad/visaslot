// src/components/SupportGlowButton.js
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function SupportGlowButton() {
  const navigate = useNavigate();

  const handleSupportClick = () => {
    navigate('/support');
  };

  return (
    <>
      <Button
        variant="success"
        className="support-glow-btn"
        onClick={handleSupportClick}
      >
        <i className="fas fa-life-ring me-2"></i>
        Get Support
        <div className="glow"></div>
      </Button>

      <style jsx>{`
        .support-glow-btn {
          position: relative;
          background: linear-gradient(45deg, #28a745, #20c997);
          border: none;
          border-radius: 12px;
          padding: 15px 30px;
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
        }
        
        .support-glow-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(40, 167, 69, 0.6);
          background: linear-gradient(45deg, #20c997, #28a745);
        }
        
        .support-glow-btn:active {
          transform: translateY(-1px);
        }
        
        .glow {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transition: left 0.5s ease;
        }
        
        .support-glow-btn:hover .glow {
          left: 100%;
        }
      `}</style>
    </>
  );
}

export default SupportGlowButton;