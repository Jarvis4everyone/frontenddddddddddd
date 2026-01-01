import './Loader.css';

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="loader-gif">
          <img src="/jarvis.gif" alt="Loading" />
        </div>
        <div className="loader-text">
          <h2>Jarvis4Everyone</h2>
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;

