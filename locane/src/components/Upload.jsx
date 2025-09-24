import "./NewProject.css";
import uploadIcon from "../assets/upload_icon.png";

function Upload({ imageFiles, setImageFiles, onDelete }) {

    const handleFileSelect = (e) => {
        const chosenFiles = Array.from(e.target.files);
        const newImageItems = chosenFiles.map(file => ({
            file: file,
            preview: URL.createObjectURL(file)
        }));
        setImageFiles(currentFiles => [...currentFiles, ...newImageItems]);
    };

    return (
        <>
            <div className="upload-card">
                <div className="upload" onClick={() => document.getElementById("file-input").click()}>
                    <div className="cloud">
                        <img src={uploadIcon} alt={"upload image"} />
                    </div>

                    <input
                        id="file-input"
                        className="upload-btn"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                </div>
                {imageFiles.length > 0 && (
                    <div className="images">
                        {imageFiles.map((item, i) => (
                            <div className="thumbnail" key={i}>
                                <img
                                    className="preview-image"
                                    src={item.preview} 
                                    loading="lazy"
                                    alt={item.file.name} 
                                />
                                <button
                                    className="delete-btn"

                                    onClick={() => onDelete(i)}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="file-count">Files Selected: {imageFiles.length}</div>
        </>
    );
}

export default Upload;