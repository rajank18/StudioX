import React from 'react';

const FeatureGuide = ({ description, steps = [], tips = [] }) => {
  return (
    <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">About this feature</h2>
      <p className="text-gray-700 mb-4">{description}</p>

      {steps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">How to use</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default FeatureGuide;
