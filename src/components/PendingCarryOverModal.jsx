import "./PendingCarryOverModal.css";

export default function PendingCarryOverModal({ count, onAccept, onReject }) {
    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Pending Tasks from Yesterday</h3>
                <p>You had {count} unfinished tasks.</p>

                <div className="modal-actions">
                    <button className="primary" onClick={onAccept}>
                        Continue Today
                    </button>
                    <button onClick={onReject}>
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
}
