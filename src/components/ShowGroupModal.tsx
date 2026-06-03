import { Loader2, X } from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";

const ShowGroupModal = ({
  setShowGroupModal,
  groupName,
  setGroupName,
  groupCode,
  setGroupCode,
  isSubmittingGroup,
  handleSubmitGroup,
}: {
  setShowGroupModal: Dispatch<SetStateAction<boolean>>;
  groupName: string;
  setGroupName: Dispatch<SetStateAction<string>>;
  groupCode: string;
  setGroupCode: Dispatch<SetStateAction<string>>;
  isSubmittingGroup: boolean;
  handleSubmitGroup: () => Promise<void>;
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => setShowGroupModal(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Create Collection Group
          </h3>
          <button
            onClick={() => setShowGroupModal(false)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <select
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" disabled>
                Select Group
              </option>
              <option value="Utilities & Post Paid">
                Utilities & Post Paid
              </option>
              <option value="Government Service">Government Service</option>
              <option value="Travel & Transport">Travel & Transport</option>
              <option value="E-Commerce">E-Commerce</option>
              <option value="Entertainment">Entertainment</option>
              <option value="School Fee">School Fee</option>
              <option value="Other Payment">Other Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Code
            </label>
            <select
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" disabled>
                Select Group code
              </option>
              <option value="Utilities&Post_Paid">Utilities&Post_Paid</option>
              <option value="Government_Service">Government_Service</option>
              <option value="Travel_Transport_v0">Travel_Transport_v0</option>
              <option value="E_Commerce">E_Commerce</option>
              <option value="Entertainment">Entertainment</option>
              <option value="School_Fee">School_Fee</option>
              <option value="Other_Payment">Other_Payment</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-6 border-t mt-4">
          <button
            onClick={() => setShowGroupModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isSubmittingGroup}
          >
            Skip
          </button>
          <button
            onClick={handleSubmitGroup}
            disabled={isSubmittingGroup}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmittingGroup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShowGroupModal;
